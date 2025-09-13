import type { PitchDetector, PitchFrame } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ORT = any;

export default class CrepeTinyDetector implements PitchDetector {
  readonly name = 'CREPE-tiny (ONNX/WASM)';
  private ort: ORT | null = null;
  private session: unknown;
  private inputLen = 1024;   // CREPE expects 1024 samples @ 16k ≈ 64 ms window
  private modelRate = 16000; // target sample rate

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
    this.session = await this.ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
    });
  }

  reset(): void {/* CREPE is stateless per-frame; nothing to reset */ }

  processFrame(frame: Float32Array, sampleRate: number): PitchFrame {
    // Expect frame already resampled to 16k & length==1024; if not, resample/truncate/pad here.
    const x = this.ensureModelFrame(frame, sampleRate);
    // Normalization expected by your model export (often mean/std or [-1,1])
    // Here we assume raw PCM in [-1,1] is fine. Adjust if your export differs.
    const input = new this.ort.Tensor('float32', x, [1, this.inputLen]);
    // Model-specific output parsing; many CREPE exports emit logits over pitch bins (e.g., 360 bins)
    // TODO: adapt to your model's IO names
    const feeds = { 'input': input };
    // @ts-expect-error - onnxruntime-web types not available
    const out = this.session.run(feeds) as Record<string, Float32Array>;
    const logits: Float32Array = out['logits'] ?? out[Object.keys(out)[0]];
    // Convert logits to pitch Hz & confidence:
    const { hz, conf } = this.decodeCrepeBins(logits);
    return { pitchHz: hz, confidence: conf };
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
    
    // Enable WASM SIMD+threads only when cross-origin isolated
    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
    if (isIsolated && ort.env?.wasm) {
      // Enable SIMD and threads for maximum performance
      ort.env.wasm.simd = config?.simd ?? true;
      ort.env.wasm.numThreads = config?.threads ?? navigator.hardwareConcurrency ?? 4;
    }
    
    const detector = new CrepeTinyDetector();
    await detector.initialize({ 
      onnx: ort, 
      ...config 
    });
    return detector;
  } catch (error) {
    throw new Error(`Failed to create CREPE detector: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
