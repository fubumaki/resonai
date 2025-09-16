import { describe, it, expect } from 'vitest';
import { estimateFormants, bucketFormants } from '@/engine/audio/lpcEstimator';

function makeSine(len: number, freqIndex: number): Float32Array {
  const a = new Float32Array(len);
  for (let i = 0; i < len; i++) a[i] = Math.sin((Math.PI * 2 * freqIndex * i) / len);
  return a;
}

describe('lpcEstimator', () => {
  it('returns nulls for empty input', () => {
    const est = estimateFormants(new Float32Array(0), 48000);
    expect(est.f1Hz).toBeNull();
    expect(est.f2Hz).toBeNull();
  });

  it('produces plausible buckets', () => {
    const samples = makeSine(1024, 64);
    const est = estimateFormants(samples, 48000);
    const buckets = bucketFormants(est);
    expect(['low', 'mid', 'high', 'unknown']).toContain(buckets.f1Bucket);
    expect(['low', 'mid', 'high', 'unknown']).toContain(buckets.f2Bucket);
  });
});
