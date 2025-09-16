'use client';

import React from 'react';

import { calculateTrainingSessionProgress, type TrainingSessionProgress } from '@/lib/progress';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
  ariaDescribedBy?: string;
}

export default function ProgressBar({
  currentStep,
  totalSteps,
  className = '',
  ariaDescribedBy
}: ProgressBarProps) {
  const progress: TrainingSessionProgress = calculateTrainingSessionProgress(currentStep, totalSteps);

  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={progress.safeStep}
      aria-valuemin={0}
      aria-valuemax={progress.safeTotal}
      aria-describedby={ariaDescribedBy}
      data-testid="progress-bar"
      data-progress={progress.percent}
    >
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
        <span>Step {progress.safeStep} of {progress.safeTotal}</span>
        <span>{progress.percent}%</span>
      </div>

      <svg
        className="meter-svg"
        aria-hidden="true"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        <rect className="meter-bg" x="0" y="0" width="100" height="8" rx="4" />
        <rect
          className="meter-fill"
          x="0"
          y="0"
          height="8"
          rx="4"
          width={progress.width}
        />
      </svg>
    </div>
  );
}
