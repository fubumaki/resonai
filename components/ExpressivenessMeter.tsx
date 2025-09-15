'use client';

interface ExpressivenessMeterProps {
  value01: number;
  label?: string;
  showPercentage?: boolean;
}

export function ExpressivenessMeter({
  value01,
  label = 'Expressiveness',
  showPercentage = true,
}: ExpressivenessMeterProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value01)) * 100);

  return (
    <div>
      <svg
        className="meter-svg"
        role="img"
        aria-label={`${label} meter`}
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
      >
        <rect className="meter-bg" x="0" y="0" width="100" height="16" rx="6" />
        <rect
          className="meter-fill"
          x="0"
          y="0"
          height="16"
          rx="6"
          width={Math.max(0, Math.min(100, pct))}
        />
      </svg>
      {showPercentage && (
        <div className="row justify-between badge-quiet mt-8">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
    </div>
  );
}
