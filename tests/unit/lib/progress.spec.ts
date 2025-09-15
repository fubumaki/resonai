import { describe, it, expect } from 'vitest';
import {
  calculateTrainingSessionProgress,
  getTrainingSessionProgress,
  safeGetTrainingSessionProgress,
  createProgressCalculator,
  isProgressComplete,
  isProgressAtStart,
  getProgressStatusText,
  isValidProgressInput,
  isSafeNumber,
  isPositiveInteger,
  isValidNumber,
  isValidPositiveInteger,
  isValidNonNegativeInteger,
  clampProgressValue,
  type TrainingSessionProgress,
  type ProgressInput
} from '@/lib/progress';

describe('Progress Library', () => {
  describe('calculateTrainingSessionProgress', () => {
    it('calculates progress correctly for normal inputs', () => {
      const result = calculateTrainingSessionProgress(3, 10);
      expect(result).toEqual({
        safeStep: 3,
        safeTotal: 10,
        percent: 30,
        width: 30
      });
    });

    it('handles zero progress', () => {
      const result = calculateTrainingSessionProgress(0, 10);
      expect(result).toEqual({
        safeStep: 0,
        safeTotal: 10,
        percent: 0,
        width: 0
      });
    });

    it('handles complete progress', () => {
      const result = calculateTrainingSessionProgress(10, 10);
      expect(result).toEqual({
        safeStep: 10,
        safeTotal: 10,
        percent: 100,
        width: 100
      });
    });

    it('clamps negative steps to zero', () => {
      const result = calculateTrainingSessionProgress(-5, 10);
      expect(result).toEqual({
        safeStep: 0,
        safeTotal: 10,
        percent: 0,
        width: 0
      });
    });

    it('clamps overflow steps to total', () => {
      const result = calculateTrainingSessionProgress(15, 10);
      expect(result).toEqual({
        safeStep: 10,
        safeTotal: 10,
        percent: 100,
        width: 100
      });
    });

    it('handles invalid total with safe fallback', () => {
      const result = calculateTrainingSessionProgress(5, 0);
      expect(result).toEqual({
        safeStep: 1,
        safeTotal: 1,
        percent: 100,
        width: 100
      });
    });

    it('handles negative total with safe fallback', () => {
      const result = calculateTrainingSessionProgress(3, -5);
      expect(result).toEqual({
        safeStep: 1,
        safeTotal: 1,
        percent: 100,
        width: 100
      });
    });

    it('handles non-finite inputs safely', () => {
      const result = calculateTrainingSessionProgress(NaN, Infinity);
      expect(result).toEqual({
        safeStep: 0,
        safeTotal: 1,
        percent: 0,
        width: 0
      });
    });
  });

  describe('getTrainingSessionProgress', () => {
    it('works with ProgressInput object', () => {
      const input: ProgressInput = { currentStep: 4, totalSteps: 8 };
      const result = getTrainingSessionProgress(input);
      expect(result).toEqual({
        safeStep: 4,
        safeTotal: 8,
        percent: 50,
        width: 50
      });
    });
  });

  describe('safeGetTrainingSessionProgress', () => {
    it('returns null for invalid input', () => {
      expect(safeGetTrainingSessionProgress(null)).toBeNull();
      expect(safeGetTrainingSessionProgress(undefined)).toBeNull();
      expect(safeGetTrainingSessionProgress('invalid')).toBeNull();
      expect(safeGetTrainingSessionProgress({})).toBeNull();
    });

    it('returns progress for valid input', () => {
      const input: ProgressInput = { currentStep: 2, totalSteps: 5 };
      const result = safeGetTrainingSessionProgress(input);
      expect(result).toEqual({
        safeStep: 2,
        safeTotal: 5,
        percent: 40,
        width: 40
      });
    });
  });

  describe('createProgressCalculator', () => {
    it('creates calculator for specific total', () => {
      const calculator = createProgressCalculator(20);
      const result = calculator(5);
      expect(result).toEqual({
        safeStep: 5,
        safeTotal: 20,
        percent: 25,
        width: 25
      });
    });
  });

  describe('isProgressComplete', () => {
    it('returns true for 100% progress', () => {
      const progress: TrainingSessionProgress = {
        safeStep: 10,
        safeTotal: 10,
        percent: 100,
        width: 100
      };
      expect(isProgressComplete(progress)).toBe(true);
    });

    it('returns false for incomplete progress', () => {
      const progress: TrainingSessionProgress = {
        safeStep: 5,
        safeTotal: 10,
        percent: 50,
        width: 50
      };
      expect(isProgressComplete(progress)).toBe(false);
    });
  });

  describe('isProgressAtStart', () => {
    it('returns true for 0% progress', () => {
      const progress: TrainingSessionProgress = {
        safeStep: 0,
        safeTotal: 10,
        percent: 0,
        width: 0
      };
      expect(isProgressAtStart(progress)).toBe(true);
    });

    it('returns false for non-zero progress', () => {
      const progress: TrainingSessionProgress = {
        safeStep: 3,
        safeTotal: 10,
        percent: 30,
        width: 30
      };
      expect(isProgressAtStart(progress)).toBe(false);
    });
  });

  describe('getProgressStatusText', () => {
    it('formats status text correctly', () => {
      const progress: TrainingSessionProgress = {
        safeStep: 7,
        safeTotal: 15,
        percent: 47,
        width: 47
      };
      expect(getProgressStatusText(progress)).toBe('Step 7 of 15 (47%)');
    });
  });

  describe('Type Guards', () => {
    describe('isValidProgressInput', () => {
      it('validates correct ProgressInput', () => {
        expect(isValidProgressInput({ currentStep: 1, totalSteps: 5 })).toBe(true);
      });

      it('rejects invalid inputs', () => {
        expect(isValidProgressInput(null)).toBe(false);
        expect(isValidProgressInput({})).toBe(false);
        expect(isValidProgressInput({ currentStep: 1 })).toBe(false);
        expect(isValidProgressInput({ totalSteps: 5 })).toBe(false);
        expect(isValidProgressInput({ currentStep: '1', totalSteps: 5 })).toBe(false);
      });
    });

    describe('isSafeNumber', () => {
      it('validates safe numbers', () => {
        expect(isSafeNumber(5)).toBe(true);
        expect(isSafeNumber(0)).toBe(true);
        expect(isSafeNumber(3.14)).toBe(true);
      });

      it('rejects unsafe numbers', () => {
        expect(isSafeNumber(-1)).toBe(false);
        expect(isSafeNumber(NaN)).toBe(false);
        expect(isSafeNumber(Infinity)).toBe(false);
        expect(isSafeNumber(-Infinity)).toBe(false);
      });
    });

    describe('isPositiveInteger', () => {
      it('validates positive integers', () => {
        expect(isPositiveInteger(1)).toBe(true);
        expect(isPositiveInteger(100)).toBe(true);
      });

      it('rejects non-positive or non-integers', () => {
        expect(isPositiveInteger(0)).toBe(false);
        expect(isPositiveInteger(-1)).toBe(false);
        expect(isPositiveInteger(3.14)).toBe(false);
        expect(isPositiveInteger(NaN)).toBe(false);
      });
    });

    describe('isValidNumber', () => {
      it('validates valid numbers', () => {
        expect(isValidNumber(5)).toBe(true);
        expect(isValidNumber(0)).toBe(true);
        expect(isValidNumber(-5)).toBe(true);
        expect(isValidNumber(3.14)).toBe(true);
      });

      it('rejects invalid numbers', () => {
        expect(isValidNumber(NaN)).toBe(false);
        expect(isValidNumber(Infinity)).toBe(false);
        expect(isValidNumber(-Infinity)).toBe(false);
      });
    });

    describe('isValidPositiveInteger', () => {
      it('validates positive integers', () => {
        expect(isValidPositiveInteger(1)).toBe(true);
        expect(isValidPositiveInteger(100)).toBe(true);
      });

      it('rejects non-positive or non-integers', () => {
        expect(isValidPositiveInteger(0)).toBe(false);
        expect(isValidPositiveInteger(-1)).toBe(false);
        expect(isValidPositiveInteger(3.14)).toBe(false);
        expect(isValidPositiveInteger(NaN)).toBe(false);
      });
    });

    describe('isValidNonNegativeInteger', () => {
      it('validates non-negative integers', () => {
        expect(isValidNonNegativeInteger(0)).toBe(true);
        expect(isValidNonNegativeInteger(1)).toBe(true);
        expect(isValidNonNegativeInteger(100)).toBe(true);
      });

      it('rejects negative or non-integers', () => {
        expect(isValidNonNegativeInteger(-1)).toBe(false);
        expect(isValidNonNegativeInteger(3.14)).toBe(false);
        expect(isValidNonNegativeInteger(NaN)).toBe(false);
      });
    });
  });

  describe('clampProgressValue', () => {
    it('clamps values to range', () => {
      expect(clampProgressValue(5, 0, 10)).toBe(5);
      expect(clampProgressValue(-1, 0, 10)).toBe(0);
      expect(clampProgressValue(15, 0, 10)).toBe(10);
    });

    it('handles invalid input with min fallback', () => {
      expect(clampProgressValue(NaN, 0, 10)).toBe(0);
      expect(clampProgressValue(Infinity, 0, 10)).toBe(0);
    });
  });
});
