export type Hz = number;
export type Semitones = number;

export interface PitchFrame {
  /** absolute pitch in Hz; null if unvoiced */
  pitchHz: Hz | null;
  /** detector confidence 0..1 (null pitch implies 0) */
  confidence: number;
  /** audio-time in seconds at the end of this frame (optional, for logging) */
  tSec?: number;
}

export interface PitchDetector {
  /** Initialize model/algorithm, may fetch assets; must be idempotent */
  initialize(config?: Record<string, unknown>): Promise<void>;
  /** Process a mono frame of PCM samples; return pitch+confidence */
  processFrame(frame: Float32Array, sampleRate: number): PitchFrame;
  /** Reset any internal state at voiced segment boundaries or flow changes */
  reset(): void;
  /** Human-readable name for logs */
  readonly name: string;
}

export interface Smoother {
  /** Feed a raw (possibly null) pitch in Hz with an optional voiced flag and get a smoothed (or null) pitch */
  update(pitchHz: Hz | null, isVoiced: boolean): Hz | null;
  reset(): void;
}

export interface PitchEngineConfig {
  /** Browser capture rate; typically 48000 on Win11/Firefox */
  inputSampleRate: number;
  /** Target model rate for CREPE (16k) or YIN (use input). Engine will resample if needed. */
  modelSampleRate: number;
  /** Analysis hop in seconds (≈ 10 ms by default) */
  hopSec: number;
  /** Median window (frames) before Kalman; odd number recommended */
  medianWindow: number;
  /** Kalman defaults */
  kalman: {
    /** process noise variance (how quickly pitch can change) in semitones^2 per frame */
    qSemitones2: number;
    /** measurement noise variance in semitones^2 per frame */
    rSemitones2: number;
    /** re-prime on new voiced segments for fast lock */
    fastLockFrames: number;
  };
  /** Confidence threshold for voicing (detector-specific but normalized to 0..1) */
  confidenceGate: number;
  /** Optional amplitude (RMS) gate to suppress spurious low-level detections */
  rmsGate?: number;
}

export interface PitchEngineMetrics {
  /** fraction of frames within target band (for glide/band drills) */
  timeInTargetPct?: number;
  /** EMA of frame-to-frame semitone delta (proxy for jitter/smoothness) */
  jitterEma?: number;
  /** running baseline (median) pitch in Hz for relative views */
  baselineHz?: number;
}

export interface PitchEngineOutput {
  /** last smoothed pitch (Hz) or null if unvoiced/gated */
  pitchHz: Hz | null;
  /** instantaneous semitone value relative to current baseline (if baseline known) */
  semitoneRel?: Semitones | null;
  /** raw detector output for debugging/telemetry */
  raw: PitchFrame;
  /** rolling metrics used by flow logic */
  metrics: PitchEngineMetrics;
}
