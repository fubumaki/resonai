// Minimal YIN pitch estimator (time-domain) for unit testing and integration

export type YinOptions = {
  threshold?: number;   // absolute threshold for cumulative mean normalized difference (default 0.1)
  minHz?: number;       // minimum detectable frequency
  maxHz?: number;       // maximum detectable frequency
};

export function yinEstimateF0(samples: Float32Array, sampleRate: number, opts: YinOptions = {}): number | null {
  const threshold = opts.threshold ?? 0.1;
  const minHz = opts.minHz ?? 60;
  const maxHz = opts.maxHz ?? 800;
  if (samples.length < 64 || sampleRate <= 0) return null;

  const maxTau = Math.floor(sampleRate / minHz);
  const minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const N = Math.min(samples.length - 1, maxTau + 1);

  // Difference function d(tau)
  const d = new Float32Array(N);
  for (let tau = 1; tau < N; tau++) {
    let sum = 0;
    for (let i = 0; i + tau < samples.length; i++) {
      const diff = samples[i] - samples[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalized difference function CMND(tau)
  const cmnd = new Float32Array(N);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < N; tau++) {
    runningSum += d[tau];
    cmnd[tau] = d[tau] * tau / (runningSum || 1);
  }

  // Absolute threshold
  let tauEstimate = -1;
  for (let tau = minTau; tau < N; tau++) {
    if (cmnd[tau] < threshold) {
      // Local minimum check
      while (tau + 1 < N && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate < 0) return null;

  // Parabolic interpolation around tauEstimate
  const tau = tauEstimate;
  const x0 = tau > 1 ? cmnd[tau - 1] : cmnd[tau];
  const x1 = cmnd[tau];
  const x2 = tau + 1 < N ? cmnd[tau + 1] : cmnd[tau];
  const denom = (x0 + x2 - 2 * x1) || 1;
  const betterTau = tau + 0.5 * (x0 - x2) / denom;

  const f0 = sampleRate / betterTau;
  if (!isFinite(f0) || f0 < minHz || f0 > maxHz) return null;
  return f0;
}


