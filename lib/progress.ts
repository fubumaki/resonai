/**
 * TrainingSessionProgress - Pure helper for progress calculations
 * 
 * Provides safe clamping of totals/steps and returns normalized progress data
 * with type-safe guards for component consumption.
 */

export interface TrainingSessionProgress {
  /** Clamped current step (0 <= safeStep <= safeTotal) */
  safeStep: number;
  /** Clamped total steps (minimum 1) */
  safeTotal: number;
  /** Progress percentage (0-100) */
  percent: number;
  /** Width percentage for UI (0-100) */
  width: number;
}

export interface ProgressInput {
  currentStep: number;
  totalSteps: number;
}

/**
 * Type guard to check if input is valid progress data
 */
export function isValidProgressInput(input: unknown): input is ProgressInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    typeof (input as ProgressInput).currentStep === 'number' &&
    typeof (input as ProgressInput).totalSteps === 'number'
  );
}

/**
 * Type guard to check if a number is finite and non-negative
 */
export function isSafeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Type guard to check if a number is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Type guard to check if a value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && !Number.isNaN(value);
}

/**
 * Type guard to check if a value is a valid positive integer
 */
export function isValidPositiveInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value) && value > 0;
}

/**
 * Type guard to check if a value is a valid non-negative integer
 */
export function isValidNonNegativeInteger(value: unknown): value is number {
  return isValidNumber(value) && Number.isInteger(value) && value >= 0;
}


/**
 * Clamps a value to a safe range for progress calculations
 */
export function clampProgressValue(value: number, min: number, max: number): number {
  if (!isValidNumber(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates safe progress data with proper clamping
 * 
 * @param currentStep - Current step (will be clamped to 0 <= step <= total)
 * @param totalSteps - Total steps (will be clamped to minimum 1)
 * @returns Normalized progress data with safe values
 */
export function calculateTrainingSessionProgress(
  currentStep: number,
  totalSteps: number
): TrainingSessionProgress {
  // Clamp totalSteps to minimum 1, handle invalid inputs
  const rawTotal = Number(totalSteps);
  const hasValidTotal = Number.isFinite(rawTotal) && rawTotal > 0;
  const safeTotal = hasValidTotal ? Math.max(1, Math.round(rawTotal)) : 1;

  // Clamp currentStep to valid range
  const rawStep = Number(currentStep);
  const roundedStep = Number.isFinite(rawStep) ? Math.round(rawStep) : 0;
  const safeStep = Math.min(Math.max(roundedStep, 0), safeTotal);

  // Calculate progress ratio and percentage
  const ratio = safeTotal > 0 ? safeStep / safeTotal : 0;
  const safeRatio = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
  const percent = Math.round(safeRatio * 100);
  const width = safeRatio * 100;

  return {
    safeStep,
    safeTotal,
    percent,
    width,
  };
}

/**
 * Convenience function that accepts a ProgressInput object
 */
export function getTrainingSessionProgress(input: ProgressInput): TrainingSessionProgress {
  return calculateTrainingSessionProgress(input.currentStep, input.totalSteps);
}

/**
 * Validates and calculates progress with type safety
 * Returns null if input is invalid
 */
export function safeGetTrainingSessionProgress(
  input: unknown
): TrainingSessionProgress | null {
  if (!isValidProgressInput(input)) {
    return null;
  }

  return getTrainingSessionProgress(input);
}

/**
 * Creates a progress calculator function for a specific total
 * Useful for creating reusable progress calculators
 */
export function createProgressCalculator(totalSteps: number) {
  const safeTotal = Math.max(1, Math.round(Number(totalSteps)));

  return (currentStep: number): TrainingSessionProgress => {
    return calculateTrainingSessionProgress(currentStep, safeTotal);
  };
}

/**
 * Checks if progress is complete (100%)
 */
export function isProgressComplete(progress: TrainingSessionProgress): boolean {
  return progress.percent === 100;
}

/**
 * Checks if progress is at the beginning (0%)
 */
export function isProgressAtStart(progress: TrainingSessionProgress): boolean {
  return progress.percent === 0;
}

/**
 * Gets progress status as a string for accessibility
 */
export function getProgressStatusText(progress: TrainingSessionProgress): string {
  return `Step ${progress.safeStep} of ${progress.safeTotal} (${progress.percent}%)`;
}
