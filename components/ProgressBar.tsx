'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ProgressBar({ currentStep, totalSteps, className = '' }: ProgressBarProps) {
  const safeTotalSteps = Math.max(1, totalSteps);
  const clampedCurrent = Math.min(Math.max(1, currentStep), safeTotalSteps);
  const progress = (clampedCurrent / safeTotalSteps) * 100;
  
  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={clampedCurrent}
      aria-valuemin={1}
      aria-valuemax={safeTotalSteps}
    >
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
        <span>Step {clampedCurrent} of {safeTotalSteps}</span>
        <span>{Math.round(progress)}%</span>
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
          width={progress}
        />
      </svg>
    </div>
  );
}
