import { describe, it, expect } from 'vitest';
import { yinEstimateF0 } from '@/engine/audio/yin';

function synthSine(freqHz: number, sampleRate = 48000, seconds = 0.05): Float32Array {
  const n = Math.floor(sampleRate * seconds);
  const a = new Float32Array(n);
  for (let i = 0; i < n; i++) a[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate);
  return a;
}

describe('yinEstimateF0', () => {
  it('estimates near the target for a pure sine', () => {
    const sr = 48000;
    const target = 220; // A3
    const buf = synthSine(target, sr, 0.06);
    const f0 = yinEstimateF0(buf, sr, { threshold: 0.1, minHz: 50, maxHz: 800 });
    expect(f0).not.toBeNull();
    expect(Math.abs((f0 as number) - target)).toBeLessThan(5);
  });

  it('returns null on invalid input', () => {
    expect(yinEstimateF0(new Float32Array(0), 48000)).toBeNull();
  });
});


