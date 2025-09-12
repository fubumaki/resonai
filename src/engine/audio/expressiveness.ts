// Lightweight, unit-testable expressiveness metric.
// Idea: measure pitch variability (in cents, detrended) over a voiced segment
// and normalize to 0..1 against a reasonable reference spread.

export type Expressiveness = {
  stdevCents: number;   // standard deviation over voiced segment (detrended)
  iqrCents: number;     // interquartile range (robust)
  rangeCents: number;   // max - min (guarded)
  score01: number;      // normalized 0..1
  voicedMs: number;     // voiced duration used
  sampleCount: number;  // voiced sample count used
};

export type ExprOptions = {
  refSpreadCents?: number;  // spread at which score→~1.0 (default 300c ~= 3 semitones)
  minSamples?: number;      // default 10
};

export function computeExpressiveness(
  centsSeries: number[],
  voicedMs: number,
  opts: ExprOptions = {}
): Expressiveness {
  const ref = opts.refSpreadCents ?? 300;
  const minN = opts.minSamples ?? 10;

  if (!centsSeries.length) {
    return { stdevCents: 0, iqrCents: 0, rangeCents: 0, score01: 0, voicedMs, sampleCount: 0 };
  }

  const n = centsSeries.length;
  const mean = centsSeries.reduce((s, v) => s + v, 0) / n;
  const detr = centsSeries.map(v => v - mean);

  const variance = detr.reduce((s, v) => s + v * v, 0) / Math.max(1, n - 1);
  const stdev = Math.sqrt(variance);

  const sorted = [...detr].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  const mn = Math.min(...detr), mx = Math.max(...detr);
  const range = mx - mn;

  // Normalize via robust spread (mix stdev & iqr for stability)
  const spread = 0.6 * stdev + 0.4 * (iqr / 1.349); // IQR ≈ 1.349σ for normal
  const raw = spread / ref;
  const score = clamp01(raw);

  // Penalize if too few samples
  const penalty = n < minN ? Math.max(0, 1 - (n / minN)) : 0;
  const scorePenalized = clamp01(score * (1 - 0.5 * penalty));

  return {
    stdevCents: stdev,
    iqrCents: iqr,
    rangeCents: range,
    score01: scorePenalized,
    voicedMs,
    sampleCount: n
  };
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function quantile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}
