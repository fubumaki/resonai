import { PitchDetector, PitchEngineConfig, PitchEngineMetrics, PitchEngineOutput, PitchFrame, Hz } from './types';
import MedianFilter from './smoothing/MedianFilter';
import Kalman1D from './smoothing/Kalman1D';

export const DEFAULT_PITCH_ENGINE: PitchEngineConfig = {
  inputSampleRate: 48000,      // Firefox on Win11
  modelSampleRate: 16000,      // CREPE target
  hopSec: 0.010,               // 10 ms analysis hop
  medianWindow: 5,             // ~50 ms
  kalman: {
    qSemitones2: 0.04,
    rSemitones2: 0.25,
    fastLockFrames: 4,
  },
  confidenceGate: 0.5,         // CREPE conf gate (fallback: combine with RMS if desired)
  rmsGate: undefined,
};

export class PitchEngine {
  private cfg: PitchEngineConfig;
  private detector: PitchDetector;
  private median: MedianFilter;
  private kalman: Kalman1D;
  private aggBuf: Float32Array;
  private aggFill = 0;
  private hopSamples: number;
  private rmsEma = 0;
  private jitterEma = 0;
  private jitterAlpha = 0.1;   // per research doc
  private baselineHz: Hz | null = null;
  private lastSemi: number | null = null;

  constructor(detector: PitchDetector, cfg: Partial<PitchEngineConfig> = {}) {
    this.cfg = { ...DEFAULT_PITCH_ENGINE, ...cfg };
    this.detector = detector;
    this.median = new MedianFilter(this.cfg.medianWindow);
    // Start with a neutral baseline (will set after first stable voiced frames)
    this.kalman = new Kalman1D({
      qSemitones2: this.cfg.kalman.qSemitones2,
      rSemitones2: this.cfg.kalman.rSemitones2,
      fastLockFrames: this.cfg.kalman.fastLockFrames,
      baselineHz: 160, // temp, updated when baseline becomes known
    });
    // Aggregate 16k @ 10ms ⇒ 160 samples. For CREPE frame 1024, we assemble internally inside detector.
    this.hopSamples = Math.round(this.cfg.inputSampleRate * this.cfg.hopSec);
    this.aggBuf = new Float32Array(Math.max(this.hopSamples, 2048));
  }

  async initialize(detectorConfig?: Record<string, unknown>) {
    await this.detector.initialize(detectorConfig);
  }

  reset(): void {
    this.median.reset();
    this.kalman.reset();
    this.aggFill = 0;
    this.rmsEma = 0;
    this.jitterEma = 0;
    this.baselineHz = null;
    this.lastSemi = null;
    this.detector.reset();
  }

  /**
   * Push raw mono PCM at inputSampleRate (e.g., 48 kHz, 128-sample chunks from AudioWorklet).
   * Returns the latest smoothed output (or null pitch) when a hop boundary is crossed.
   */
  pushSamples(chunk: Float32Array): PitchEngineOutput | null {
    // Accumulate into hop-sized windows
    let out: PitchEngineOutput | null = null;
    let i = 0;
    while (i < chunk.length) {
      const need = this.hopSamples - this.aggFill;
      const take = Math.min(need, chunk.length - i);
      this.aggBuf.set(chunk.subarray(i, i + take), this.aggFill);
      this.aggFill += take; 
      i += take;
      if (this.aggFill === this.hopSamples) {
        // Analysis hop: build model frame(s) for detector
        out = this.processHop(this.aggBuf.subarray(0, this.hopSamples));
        this.aggFill = 0;
      }
    }
    return out; // most recent hop result, or null if not enough samples yet
  }

  private processHop(hopPcm: Float32Array): PitchEngineOutput {
    // Optional: update RMS EMA for safety gating (not gating by default)
    const rms = this.computeRms(hopPcm);
    this.rmsEma = 0.95 * this.rmsEma + 0.05 * rms;

    // Prepare detector frame: for CREPE, we'll internally resample/assemble; for YIN, this hop is adequate
    const raw: PitchFrame = this.detector.processFrame(hopPcm, this.cfg.inputSampleRate);

    const isConfident = (raw.confidence ?? 0) >= this.cfg.confidenceGate;
    const rawPitch = isConfident ? raw.pitchHz : null;

    // Median smoothing in Hz
    const medHz = this.median.update(rawPitch);

    // Maintain/update baseline (median-like) when confident voiced frames appear
    if (medHz != null) {
      if (this.baselineHz == null) this.baselineHz = medHz;
      // Slow baseline drift (robust against brief excursions)
      this.baselineHz = this.baselineHz * 0.995 + medHz * 0.005;
      this.kalman.setBaselineHz(this.baselineHz);
    }

    // Kalman smoothing (in semitone space via Kalman1D wrapper)
    const smoothHz = this.kalman.update(medHz, medHz != null);

    // Jitter EMA (frame-to-frame semitone delta) for smoothness metric
    let jitterEma = this.jitterEma;
    if (smoothHz != null && this.baselineHz != null) {
      const semi = 12 * Math.log2(smoothHz / this.baselineHz);
      if (this.lastSemi != null) {
        const delta = Math.abs(semi - this.lastSemi);
        jitterEma = (1 - this.jitterAlpha) * jitterEma + this.jitterAlpha * delta;
      }
      this.lastSemi = semi;
    } else {
      this.lastSemi = null;
    }
    this.jitterEma = jitterEma;

    const metrics: PitchEngineMetrics = {
      jitterEma: this.jitterEma,
      baselineHz: this.baselineHz ?? undefined,
    };

    const out: PitchEngineOutput = {
      pitchHz: smoothHz ?? null,
      semitoneRel: (smoothHz != null && this.baselineHz != null)
        ? 12 * Math.log2(smoothHz / this.baselineHz) : null,
      raw,
      metrics,
    };
    return out;
  }

  private computeRms(buf: Float32Array): number {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }
}
