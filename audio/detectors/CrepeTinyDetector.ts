import type { PitchDetector, PitchFrame } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ORT = any;

type InferenceSessionLike = {
  inputNames?: string[];
  outputNames?: string[];
  run: (
    feeds: Record<string, unknown>,
    fetches?: string[]
  ) => Record<string, unknown>;
};

export default class CrepeTinyDetector implements PitchDetector {
  readonly name = 'CREPE-tiny (ONNX/WASM)';
  private ort: ORT | null = null;
  private session: InferenceSessionLike | null = null;
  private inputLen = 1024;   // CREPE expects 1024 samples @ 16k ≈ 64 ms window
  private modelRate = 16000; // target sample rate
  private inputName: string | null = null;
  private pitchOutputName: string | null = null;
  private confidenceOutputName: string | null = null;
  private logitsOutputName: string | null = null;
  private fetchOutputNames: string[] = [];

  async initialize(config?: { onnx?: ORT; modelUrl?: string; threads?: number; simd?: boolean }) {
    if (config?.onnx) {
      this.ort = config.onnx;
    } else {
      throw new Error('CREPE detector requires onnxruntime-web to be provided via config.onnx. Use createCrepeDetector() factory function.');
    }
    
    // Enable WASM SIMD+threads per research
    if (this.ort?.env?.wasm) {
      if (typeof config?.threads === 'number') this.ort.env.wasm.numThreads = config.threads;
      if (typeof config?.simd === 'boolean') this.ort.env.wasm.simd = config.simd;
    }
    const modelUrl = config?.modelUrl ?? '/models/crepe-tiny.onnx';
    const session = await this.ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
    });
    this.session = session as InferenceSessionLike;

    const inputNames = Array.isArray((session as { inputNames?: string[] }).inputNames)
      ? (session as { inputNames?: string[] }).inputNames
      : [];
    const outputNames = Array.isArray((session as { outputNames?: string[] }).outputNames)
      ? (session as { outputNames?: string[] }).outputNames
      : [];

    this.inputName = inputNames[0] ?? null;

    const pitchName = outputNames.find(name => /freq|pitch/i.test(name)) ?? null;
    const confidenceName = outputNames.find(name => /conf|prob/i.test(name)) ?? null;
    const logitsName = outputNames.find(name => /logit|bin/i.test(name)) ?? null;

    this.pitchOutputName = pitchName;
    this.confidenceOutputName = confidenceName;
    this.logitsOutputName = logitsName ?? (pitchName ? null : outputNames[0] ?? null);

    if (!this.confidenceOutputName && outputNames.length > 1) {
      this.confidenceOutputName = outputNames.find(name => name !== this.pitchOutputName) ?? outputNames[1] ?? null;
    }

    const uniqueFetches = new Set<string>();
    if (this.pitchOutputName) uniqueFetches.add(this.pitchOutputName);
    if (this.confidenceOutputName) uniqueFetches.add(this.confidenceOutputName);
    if (this.logitsOutputName) uniqueFetches.add(this.logitsOutputName);
    this.fetchOutputNames = Array.from(uniqueFetches);
  }

  reset(): void {/* CREPE is stateless per-frame; nothing to reset */ }

  processFrame(frame: Float32Array, sampleRate: number): PitchFrame {
    if (!this.ort || !this.session) {
      throw new Error('CREPE detector not initialized');
    }

    // Expect frame already resampled to 16k & length==1024; if not, resample/truncate/pad here.
    const x = this.ensureModelFrame(frame, sampleRate);
    // Normalization expected by your model export (often mean/std or [-1,1])
    // Here we assume raw PCM in [-1,1] is fine. Adjust if your export differs.
    const input = new this.ort.Tensor('float32', x, [1, this.inputLen]);
    const inputName = this.inputName ?? this.session.inputNames?.[0] ?? 'input';
    const feeds: Record<string, unknown> = { [inputName]: input };

    const fetches = this.fetchOutputNames.length ? this.fetchOutputNames : undefined;
    const outputs = this.session.run(feeds, fetches) as Record<string, unknown>;

    const pitchTensor = this.pickTensor(outputs, this.pitchOutputName, /freq|pitch/i);
    const confidenceTensor = this.pickTensor(outputs, this.confidenceOutputName, /conf|prob/i);
    const logitsTensor = this.pickTensor(outputs, this.logitsOutputName, /logit|bin/i);

    let hz = this.tensorScalar(pitchTensor);
    let conf = this.tensorScalar(confidenceTensor);

    const logits = hz == null ? this.tensorData(logitsTensor ?? pitchTensor) : null;
    if (hz == null && logits) {
      const decoded = this.decodeCrepeBins(logits);
      hz = decoded.hz;
      if (conf == null) conf = decoded.conf;
    }

    return {
      pitchHz: hz ?? null,
      confidence: this.normalizeConfidence(conf),
    };
  }

  private ensureModelFrame(frame: Float32Array, sr: number): Float32Array {
    if (sr === this.modelRate && frame.length === this.inputLen) return frame;
    // Simple linear resample & center crop/pad to 1024
    const targetLen = this.inputLen;
    const resampled = this.linearResample(frame, sr, this.modelRate, targetLen);
    return resampled;
  }

  private linearResample(input: Float32Array, srIn: number, srOut: number, outLen: number): Float32Array {
    const ratio = srIn / srOut;
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const t = i * ratio;
      const i0 = Math.floor(t);
      const i1 = Math.min(i0 + 1, input.length - 1);
      const frac = t - i0;
      out[i] = (1 - frac) * (input[i0] ?? 0) + frac * (input[i1] ?? 0);
    }
    return out;
  }

  private decodeCrepeBins(bins: Float32Array): { hz: number | null; conf: number } {
    // Example mapping: 360 bins covering ~50–2000 Hz (crepe paper spec). Adjust constants to your export.
    // We apply softmax for confidence, argmax for bin, then map to Hz.
    let max = -Infinity, idx = 0; let sum = 0;
    for (let i = 0; i < bins.length; i++) { 
      const e = Math.exp(bins[i]); 
      sum += e; 
      if (e > max) { 
        max = e; 
        idx = i; 
      } 
    }
    const confidence = max / sum;
    // CREPE bin->Hz mapping (see paper); here we approximate log-spaced bins:
    const hzMin = 50, hzMax = 2000;
    const frac = idx / (bins.length - 1);
    const hz = hzMin * Math.pow(hzMax / hzMin, frac);
    // Gate low confidence as unvoiced:
    return confidence < 0.5 ? { hz: null, conf: confidence } : { hz, conf: confidence };
  }

  private pickTensor(
    outputs: Record<string, unknown>,
    preferredName: string | null,
    fallbackPattern: RegExp
  ): unknown {
    if (preferredName && preferredName in outputs) return outputs[preferredName];
    const entry = Object.entries(outputs).find(([name]) => fallbackPattern.test(name));
    return entry ? entry[1] : undefined;
  }

  private tensorData(value: unknown): Float32Array | null {
    if (!value) return null;
    if (value instanceof Float32Array) return value;
    if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
      const view = value as ArrayBufferView;
      if (view instanceof Float32Array) return view;
      if (view instanceof Float64Array) return new Float32Array(view as Float64Array);
    }
    if (Array.isArray(value)) return Float32Array.from(value);
    if (typeof value === 'object') {
      const maybeTensor = value as { data?: unknown };
      if (maybeTensor.data) return this.tensorData(maybeTensor.data);
    }
    return null;
  }

  private tensorScalar(value: unknown): number | null {
    const data = this.tensorData(value);
    if (!data || data.length === 0) return null;
    const scalar = data[0];
    return Number.isFinite(scalar) ? scalar : null;
  }

  private normalizeConfidence(value: number | null | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }
}

/**
 * Factory function to create CREPE detector with onnxruntime-web
 * Call this when onnxruntime-web is available
 */
export async function createCrepeDetector(config?: {
  modelUrl?: string;
  threads?: number;
  simd?: boolean;
}): Promise<CrepeTinyDetector> {
  try {
    const ort = await import('onnxruntime-web');

    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;
    const initConfig: {
      onnx: ORT;
      modelUrl?: string;
      threads?: number;
      simd?: boolean;
    } = { onnx: ort, ...config };

    if (isIsolated) {
      if (typeof initConfig.simd !== 'boolean') initConfig.simd = true;
      if (typeof initConfig.threads !== 'number') {
        const concurrency = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : undefined;
        if (typeof concurrency === 'number') initConfig.threads = concurrency;
      }
    }

    const detector = new CrepeTinyDetector();
    await detector.initialize(initConfig);
    return detector;
  } catch (error) {
    throw new Error(`Failed to create CREPE detector: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
