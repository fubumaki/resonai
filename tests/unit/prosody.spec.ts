import { describe, it, expect } from 'vitest';
import {
  ProsodyFrame, classifyProsody, ProsodyOptions, hzToCentsRelative, median, ema, slopePerSecond, windowVoiced, voicedDurationMs
} from '../../engine/audio/prosody';

function series(
  t0: number,
  dtMs: number,
  hz: (i: number) => number | null,
  n: number
): ProsodyFrame[] {
  const out: ProsodyFrame[] = [];
  for (let i = 0; i < n; i++) out.push({ t: t0 + i * dtMs, f0Hz: hz(i) });
  return out;
}

const baseOpts: ProsodyOptions = {
  windowMs: 1200,
  minVoicedMs: 300,
  riseCentsPerSec: 250,
  fallCentsPerSec: -250,
  emaAlpha: 0.25,
  minSamples: 8
};

describe('hzToCentsRelative', () => {
  it('converts Hz to cents relative to reference', () => {
    // 1 octave = 1200 cents
    expect(hzToCentsRelative(440, 220)).toBeCloseTo(1200, 0);
    expect(hzToCentsRelative(220, 440)).toBeCloseTo(-1200, 0);
    expect(hzToCentsRelative(440, 440)).toBeCloseTo(0, 0);
  });

  it('handles edge cases gracefully', () => {
    expect(hzToCentsRelative(0, 440)).toBe(0);
    expect(hzToCentsRelative(440, 0)).toBe(0);
    expect(hzToCentsRelative(-100, 440)).toBe(0);
    expect(hzToCentsRelative(440, -100)).toBe(0);
  });
});

describe('median', () => {
  it('calculates median for odd length arrays', () => {
    expect(median([1, 2, 3])).toBe(2);
    expect(median([1, 3, 2])).toBe(2);
  });

  it('calculates median for even length arrays', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([1, 4, 2, 3])).toBe(2.5);
  });

  it('handles empty arrays', () => {
    expect(median([])).toBe(0);
  });

  it('handles single element arrays', () => {
    expect(median([42])).toBe(42);
  });
});

describe('ema', () => {
  it('applies exponential moving average', () => {
    const values = [1, 2, 3, 4, 5];
    const result = ema(values, 0.5);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(1.5);
    expect(result[2]).toBe(2.25);
    expect(result[3]).toBe(3.125);
    expect(result[4]).toBe(4.0625);
  });

  it('handles empty arrays', () => {
    expect(ema([], 0.5)).toEqual([]);
  });

  it('handles alpha = 1 (no smoothing)', () => {
    const values = [1, 2, 3, 4, 5];
    const result = ema(values, 1);
    expect(result).toEqual(values);
  });

  it('handles alpha = 0 (no change)', () => {
    const values = [1, 2, 3, 4, 5];
    const result = ema(values, 0);
    expect(result[0]).toBe(1);
    expect(result.every(v => v === 1)).toBe(true);
  });
});

describe('slopePerSecond', () => {
  it('calculates slope for linear relationship', () => {
    const times = [0, 1000, 2000, 3000]; // 0, 1, 2, 3 seconds
    const values = [0, 1, 2, 3]; // slope = 1
    expect(slopePerSecond(times, values)).toBeCloseTo(1, 5);
  });

  it('calculates negative slope', () => {
    const times = [0, 1000, 2000, 3000];
    const values = [3, 2, 1, 0]; // slope = -1
    expect(slopePerSecond(times, values)).toBeCloseTo(-1, 5);
  });

  it('handles insufficient data', () => {
    expect(slopePerSecond([0], [1])).toBe(0);
    expect(slopePerSecond([], [])).toBe(0);
  });
});

describe('windowVoiced', () => {
  it('extracts voiced frames within window', () => {
    const frames = series(0, 100, i => i < 5 ? 200 + i : null, 10);
    const result = windowVoiced(frames, 600); // 600ms window from t=300 to t=900
    expect(result).toHaveLength(2); // Only t=300 and t=400 have voiced data in the window
    expect(result.every(f => f.f0Hz !== null)).toBe(true);
  });

  it('handles empty frames', () => {
    expect(windowVoiced([], 600)).toEqual([]);
  });

  it('filters out unvoiced frames', () => {
    const frames = series(0, 100, () => null, 5);
    expect(windowVoiced(frames, 600)).toEqual([]);
  });
});

describe('voicedDurationMs', () => {
  it('calculates duration from frame deltas', () => {
    const frames = series(0, 50, () => 200, 5); // 50ms intervals
    expect(voicedDurationMs(frames)).toBe(200); // 4 intervals * 50ms
  });

  it('handles single frame', () => {
    const frames = [{ t: 0, f0Hz: 200 }];
    expect(voicedDurationMs(frames)).toBe(0);
  });

  it('handles empty frames', () => {
    expect(voicedDurationMs([])).toBe(0);
  });
});

describe('classifyProsody', () => {
  it('detects rising contour over ~400 ms', () => {
    // 20 frames * 20ms = 400ms, 180Hz -> 200Hz linear
    const frames = series(0, 20, i => 180 + (20 * i) / 19, 20);
    const res = classifyProsody(frames, baseOpts);
    expect(res.label).toBe('rising');
    expect(res.slopeCentsPerSec).toBeGreaterThan(250);
    expect(res.insufficientVoiced).toBe(false);
  });

  it('detects falling contour over ~400 ms', () => {
    const frames = series(0, 20, i => 200 - (20 * i) / 19, 20);
    const res = classifyProsody(frames, baseOpts);
    expect(res.label).toBe('falling');
    expect(res.slopeCentsPerSec).toBeLessThan(-250);
  });

  it('is flat on near-constant pitch with small noise', () => {
    const frames = series(0, 20, i => 190 + (Math.sin(i) * 2), 60); // ~1.2s
    const res = classifyProsody(frames, baseOpts);
    expect(res.label).toBe('flat');
    expect(Math.abs(res.slopeCentsPerSec)).toBeLessThan(150);
  });

  it('remains flat (insufficient) if voiced segment too short', () => {
    // Only 10 frames * 20ms = 200ms voiced
    const frames = series(0, 20, i => 180 + i, 10);
    const res = classifyProsody(frames, baseOpts);
    expect(res.label).toBe('flat');
    expect(res.insufficientVoiced).toBe(true);
  });

  it('handles null (unvoiced) frames by ignoring them', () => {
    const frames: ProsodyFrame[] = [
      { t: 0, f0Hz: 180 },
      { t: 20, f0Hz: null },
      { t: 40, f0Hz: 182 },
      { t: 60, f0Hz: null },
      { t: 80, f0Hz: 184 },
      { t: 100, f0Hz: 186 },
      { t: 120, f0Hz: 188 },
      { t: 140, f0Hz: 190 }
    ];
    const res = classifyProsody(frames, { ...baseOpts, minSamples: 4, minVoicedMs: 120 });
    expect(['flat', 'rising']).toContain(res.label); // depends on tiny slope
    expect(res.sampleCount).toBeGreaterThanOrEqual(4);
    expect(res.insufficientVoiced).toBe(false);
  });

  it('slope is ~0 for constant cents series', () => {
    // constant 200 Hz -> slope should be ~0 irrespective of ref
    const frames = series(0, 10, () => 200, 120);
    const res = classifyProsody(frames, baseOpts);
    expect(Math.abs(res.slopeCentsPerSec)).toBeLessThan(50);
  });

  it('handles insufficient samples', () => {
    const frames = series(0, 20, () => 200, 3); // Only 3 samples
    const res = classifyProsody(frames, baseOpts);
    expect(res.label).toBe('flat');
    expect(res.insufficientVoiced).toBe(true);
    expect(res.sampleCount).toBe(3);
  });

  it('uses EMA smoothing when alpha > 0', () => {
    const frames = series(0, 10, i => 200 + Math.sin(i * 0.5) * 10, 100);
    const resNoSmoothing = classifyProsody(frames, { ...baseOpts, emaAlpha: 0 });
    const resWithSmoothing = classifyProsody(frames, { ...baseOpts, emaAlpha: 0.5 });
    
    // Results should be different when smoothing is applied
    expect(resNoSmoothing.slopeCentsPerSec).not.toBe(resWithSmoothing.slopeCentsPerSec);
  });

  it('respects custom thresholds', () => {
    const frames = series(0, 20, i => 180 + (20 * i) / 19, 20); // rising contour
    
    // Very high threshold should classify as flat
    const resHighThreshold = classifyProsody(frames, { ...baseOpts, riseCentsPerSec: 1000 });
    expect(resHighThreshold.label).toBe('flat');
    
    // Low threshold should classify as rising
    const resLowThreshold = classifyProsody(frames, { ...baseOpts, riseCentsPerSec: 50 });
    expect(resLowThreshold.label).toBe('rising');
  });

  it('returns proper metadata', () => {
    const frames = series(0, 20, () => 200, 20);
    const res = classifyProsody(frames, baseOpts);
    
    expect(res).toHaveProperty('label');
    expect(res).toHaveProperty('slopeCentsPerSec');
    expect(res).toHaveProperty('voicedMs');
    expect(res).toHaveProperty('sampleCount');
    expect(res).toHaveProperty('insufficientVoiced');
    expect(res).toHaveProperty('refHz');
    
    expect(res.voicedMs).toBeGreaterThan(0);
    expect(res.sampleCount).toBeGreaterThan(0);
    expect(res.refHz).toBeGreaterThan(0);
  });
});
