import { describe, it, expect } from 'vitest';
import {
  calculateTrainingSessionProgress,
  getProgressStatusText,
  isProgressAtStart,
  isProgressComplete,
} from '@/lib/progress';

describe('practice progress helpers', () => {
  it('resets progress to 0 and emits accessible status text', () => {
    const before = calculateTrainingSessionProgress(5, 10);
    expect(before.safeStep).toBe(5);
    expect(before.safeTotal).toBe(10);

    const after = calculateTrainingSessionProgress(0, before.safeTotal);
    expect(after.safeStep).toBe(0);
    expect(after.safeTotal).toBe(10);
    expect(isProgressAtStart(after)).toBe(true);
    expect(getProgressStatusText(after)).toMatch(/Step 0 of 10/i);
  });

  it('treats reset as not complete', () => {
    const afterReset = calculateTrainingSessionProgress(0, 10);
    expect(isProgressComplete(afterReset)).toBe(false);
  });
});
