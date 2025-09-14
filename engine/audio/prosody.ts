// src/engine/audio/prosody.ts
// Unit-testable helpers for end-rise / end-fall detection.
// No DOM, no WebAudio; pure math on (t, f0Hz) tuples.

export type ProsodyLabel = 'rising' | 'falling' | 'flat';

export interface ProsodyFrame {
  t: number;            // ms since stream start
  f0Hz: number | null;  // null for unvoiced
}

export interface ProsodyOptions {
  windowMs: number;           // e.g., 1200
  minVoicedMs: number;        // e.g., 300
  riseCentsPerSec: number;    // e.g., 250
  fallCentsPerSec: number;    // e.g., -250
  emaAlpha?: number;          // optional, e.g., 0.25; EMA over f0 before slope
  minSamples?: number;        // optional safeguard, e.g., 8
}

/** Natural log based conversion; robust for small deltas */
export function hzToCentsRelative(f0Hz: number, refHz: number): number {
  if (!isFinite(f0Hz) || !isFinite(refHz) || f0Hz <= 0 || refHz <= 0) return 0;
  // cents = 1200 * log2(f0/ref)
  return 1200 * (Math.log(f0Hz / refHz) / Math.log(2));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const a = values.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : 0.5 * (a[mid - 1] + a[mid]);
}

/** Exponential moving average (in-place optional) */
export function ema(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const out = new Array<number>(values.length);
  let last = values[0];
  out[0] = last;
  for (let i = 1; i < values.length; i++) {
    last = alpha * values[i] + (1 - alpha) * last;
    out[i] = last;
  }
  return out;
}

/** Least-squares slope (y over tSeconds), returns units/sec */
export function slopePerSecond(timesMs: number[], y: number[]): number {
  const n = Math.min(timesMs.length, y.length);
  if (n < 2) return 0;
  // Convert to seconds; detrend t to improve stability
  const t0 = timesMs[0] / 1000;
  const t: number[] = new Array(n);
  for (let i = 0; i < n; i++) t[i] = timesMs[i] / 1000 - t0;

  const meanT = t.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dt = t[i] - meanT;
    num += dt * (y[i] - meanY);
    den += dt * dt;
  }
  return den === 0 ? 0 : num / den;
}

/** Extract last windowMs voiced frames with their timestamps */
export function windowVoiced(frames: ProsodyFrame[], windowMs: number): ProsodyFrame[] {
  if (frames.length === 0) return [];
  const tEnd = frames[frames.length - 1].t;
  const tStart = tEnd - windowMs;
  const slice = frames.filter(f => f.t >= tStart);
  // Keep voiced
  return slice.filter(f => f.f0Hz !== null && isFinite(f.f0Hz!) && f.f0Hz! > 0);
}

/** Compute total voiced time (approx by delta t) in ms */
export function voicedDurationMs(frames: ProsodyFrame[]): number {
  if (frames.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < frames.length; i++) {
    const dt = frames[i].t - frames[i - 1].t;
    if (dt > 0) sum += dt;
  }
  return sum;
}

export interface ProsodyResult {
  label: ProsodyLabel;
  slopeCentsPerSec: number;
  voicedMs: number;
  sampleCount: number;
  insufficientVoiced: boolean; // true if voicedMs < minVoicedMs
  refHz: number;               // median ref used for cents
}

/** Main classifier: rising / falling / flat over a rolling window */
export function classifyProsody(
  frames: ProsodyFrame[],
  opts: ProsodyOptions
): ProsodyResult {
  const {
    windowMs, minVoicedMs, riseCentsPerSec, fallCentsPerSec,
    emaAlpha = 0, minSamples = 6
  } = opts;

  const win = windowVoiced(frames, windowMs);
  const vMs = voicedDurationMs(win);
  const insufficient = vMs < minVoicedMs;

  if (win.length < Math.max(2, minSamples)) {
    return {
      label: 'flat',
      slopeCentsPerSec: 0,
      voicedMs: vMs,
      sampleCount: win.length,
      insufficientVoiced: true,
      refHz: 0
    };
  }

  // Reference = median f0 over window
  const ref = median(win.map(f => f.f0Hz!) || [0]) || 1;

  // Optionally smooth f0 before cents conversion
  let f0s = win.map(f => f.f0Hz!);
  if (emaAlpha > 0 && emaAlpha <= 1) f0s = ema(f0s, emaAlpha);

  const cents = f0s.map(hz => hzToCentsRelative(hz, ref));
  const times = win.map(f => f.t);
  
  // Use trailing window for better end-detection (last 400ms of voiced frames)
  const trailingMs = Math.min(400, windowMs * 0.4);
  const trailingCutoff = times[times.length - 1] - trailingMs;
  const trailingIndices = times.map((t, i) => ({ t, i }))
    .filter(({ t }) => t >= trailingCutoff)
    .map(({ i }) => i);
  
  let slope: number;
  if (trailingIndices.length >= 3) {
    // Use trailing window slope for better end-detection
    const trailingTimes = trailingIndices.map(i => times[i]);
    const trailingCents = trailingIndices.map(i => cents[i]);
    slope = slopePerSecond(trailingTimes, trailingCents);
  } else {
    // Fall back to full window
    slope = slopePerSecond(times, cents);
  }

  let label: ProsodyLabel = 'flat';
  if (!insufficient) {
    if (slope >= riseCentsPerSec) label = 'rising';
    else if (slope <= fallCentsPerSec) label = 'falling';
  }

  return {
    label,
    slopeCentsPerSec: slope,
    voicedMs: vMs,
    sampleCount: win.length,
    insufficientVoiced: insufficient,
    refHz: ref
  };
}
