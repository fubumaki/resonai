export type FormantEstimate = { f1Hz: number | null; f2Hz: number | null };

export type LpcBuckets = {
  f1Bucket: 'low' | 'mid' | 'high' | 'unknown';
  f2Bucket: 'low' | 'mid' | 'high' | 'unknown';
};

export function estimateFormants(samples: Float32Array, sampleRate: number): FormantEstimate {
  // Placeholder: in lieu of true LPC, derive crude proxies (non-production)
  if (samples.length === 0 || !isFinite(sampleRate) || sampleRate <= 0) return { f1Hz: null, f2Hz: null };
  // Compute basic spectral centroid proxy
  let sum = 0, wsum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    sum += v;
    wsum += v * i;
  }
  if (sum === 0) return { f1Hz: null, f2Hz: null };
  const idx = wsum / sum;
  const hz = (idx / samples.length) * (sampleRate / 2);
  // Crude mapping: f1 around hz, f2 about 2x as placeholder
  return { f1Hz: Math.max(200, Math.min(900, hz)), f2Hz: Math.max(500, Math.min(2500, hz * 2)) };
}

export function bucketFormants(f: FormantEstimate): LpcBuckets {
  const f1 = f.f1Hz, f2 = f.f2Hz;
  const f1Bucket = f1 == null ? 'unknown' : f1 < 550 ? 'low' : f1 < 750 ? 'mid' : 'high';
  const f2Bucket = f2 == null ? 'unknown' : f2 < 1200 ? 'low' : f2 < 1700 ? 'mid' : 'high';
  return { f1Bucket, f2Bucket };
}
