'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export default function ProgressBar({ currentStep, totalSteps, className = '' }: ProgressBarProps) {
  const progress = Math.min((currentStep / totalSteps) * 100, 100);
  
  return (
    <div
      className={`w-full ${className}`}
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
    >
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
        <span>Step {currentStep} of {totalSteps}</span>
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
          width={Math.max(0, Math.min(100, progress))}
        />
      </svg>
    </div>
  );
}
