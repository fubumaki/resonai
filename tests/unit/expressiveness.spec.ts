import { describe, it, expect } from 'vitest';
import { computeExpressiveness } from '../../engine/audio/expressiveness';

describe('computeExpressiveness', () => {
  it('returns zero expressiveness for empty series', () => {
    const result = computeExpressiveness([], 1000);
    expect(result.score01).toBe(0);
    expect(result.stdevCents).toBe(0);
    expect(result.sampleCount).toBe(0);
  });

  it('returns zero expressiveness for constant pitch', () => {
    const constantCents = new Array(50).fill(0); // all at reference pitch
    const result = computeExpressiveness(constantCents, 1000);
    expect(result.score01).toBeCloseTo(0, 2);
    expect(result.stdevCents).toBeCloseTo(0, 2);
    expect(result.rangeCents).toBe(0);
  });

  it('returns higher expressiveness for larger pitch variability', () => {
    const lowVariability = [-50, -25, 0, 25, 50]; // ±50 cents
    const highVariability = [-200, -100, 0, 100, 200]; // ±200 cents
    
    const lowResult = computeExpressiveness(lowVariability, 1000);
    const highResult = computeExpressiveness(highVariability, 1000);
    
    expect(highResult.score01).toBeGreaterThan(lowResult.score01);
    expect(highResult.stdevCents).toBeGreaterThan(lowResult.stdevCents);
    expect(highResult.rangeCents).toBeGreaterThan(lowResult.rangeCents);
  });

  it('penalizes insufficient samples', () => {
    const sameVariability = [-100, -50, 0, 50, 100]; // ±100 cents
    const minSamples = 10;
    
    const insufficientResult = computeExpressiveness(sameVariability, 1000, { minSamples });
    const sufficientResult = computeExpressiveness(
      [...sameVariability, ...sameVariability], // 10 samples
      1000, 
      { minSamples }
    );
    
    expect(sufficientResult.score01).toBeGreaterThan(insufficientResult.score01);
  });

  it('respects custom reference spread', () => {
    const variability = [-150, -75, 0, 75, 150]; // ±150 cents
    const defaultRef = 300;
    const customRef = 150;
    
    const defaultResult = computeExpressiveness(variability, 1000, { refSpreadCents: defaultRef });
    const customResult = computeExpressiveness(variability, 1000, { refSpreadCents: customRef });
    
    // With smaller reference spread, the same variability should score higher
    expect(customResult.score01).toBeGreaterThan(defaultResult.score01);
  });

  it('returns valid metadata', () => {
    const variability = [-100, -50, 0, 50, 100];
    const result = computeExpressiveness(variability, 1500);
    
    expect(result.voicedMs).toBe(1500);
    expect(result.sampleCount).toBe(5);
    expect(result.stdevCents).toBeGreaterThan(0);
    expect(result.iqrCents).toBeGreaterThan(0);
    expect(result.rangeCents).toBe(200); // 100 - (-100)
    expect(result.score01).toBeGreaterThanOrEqual(0);
    expect(result.score01).toBeLessThanOrEqual(1);
  });

  it('handles single sample', () => {
    const singleSample = [50];
    const result = computeExpressiveness(singleSample, 1000);
    
    expect(result.stdevCents).toBe(0);
    expect(result.rangeCents).toBe(0);
    expect(result.score01).toBe(0);
    expect(result.sampleCount).toBe(1);
  });

  it('handles two samples', () => {
    const twoSamples = [0, 100];
    const result = computeExpressiveness(twoSamples, 1000);
    
    expect(result.stdevCents).toBeCloseTo(70.71, 1); // sqrt(5000) for variance of 5000
    expect(result.rangeCents).toBe(100);
    expect(result.score01).toBeGreaterThan(0);
    expect(result.sampleCount).toBe(2);
  });

  it('computes IQR correctly', () => {
    const data = [-200, -100, -50, 0, 50, 100, 200];
    const result = computeExpressiveness(data, 1000);
    
    // For this symmetric data, IQR should be around 150 (from -75 to 75)
    expect(result.iqrCents).toBeGreaterThan(0);
    expect(result.iqrCents).toBeLessThan(result.rangeCents);
  });

  it('score01 is normalized to 0-1 range', () => {
    const extremeVariability = new Array(100).fill(0).map((_, i) => (i - 50) * 20); // ±1000 cents
    const result = computeExpressiveness(extremeVariability, 1000);
    
    expect(result.score01).toBeGreaterThanOrEqual(0);
    expect(result.score01).toBeLessThanOrEqual(1);
  });

  it('detrended calculation removes mean bias', () => {
    const biasedData = [100, 101, 102, 103, 104]; // all above reference
    const centeredData = [0, 1, 2, 3, 4]; // same relative pattern
    
    const biasedResult = computeExpressiveness(biasedData, 1000);
    const centeredResult = computeExpressiveness(centeredData, 1000);
    
    // Should have similar expressiveness since pattern is the same
    expect(Math.abs(biasedResult.score01 - centeredResult.score01)).toBeLessThan(0.1);
  });
});
