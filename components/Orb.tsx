import React from 'react';

export type OrbTrend = {
  label: string;
  value: string;
};

export type OrbProps = {
  hueDeg: number;           // 0..360 resonance hue
  tiltDeg?: number;         // -20..20 for subtle shimmer tilt
  size?: number;            // px
  trends?: OrbTrend[];      // small chips displayed under orb
  ariaLabel?: string;       // accessible name
};

export default function Orb({ hueDeg, tiltDeg = 0, size = 120, trends = [], ariaLabel = 'Resonance indicator' }: OrbProps) {
  const gradientId = React.useId();
  const clampedHue = ((hueDeg % 360) + 360) % 360;
  const tilt = Math.max(-25, Math.min(25, tiltDeg));

  return (
    <div className="inline-flex flex-col items-center gap-2" aria-label={ariaLabel} role="img">
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        className="select-none"
        aria-hidden="false"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${clampedHue}, 90%, 60%)`} />
            <stop offset="70%" stopColor={`hsl(${clampedHue}, 90%, 50%)`} />
            <stop offset="100%" stopColor={`hsl(${clampedHue}, 90%, 45%)`} />
          </radialGradient>
        </defs>
        <g transform={`rotate(${tilt} 50 50)`}>
          <circle cx="50" cy="50" r="46" fill={`url(#${gradientId})`} />
          <ellipse cx="38" cy="36" rx="16" ry="10" fill="#ffffff" opacity="0.15" />
          <ellipse cx="65" cy="70" rx="22" ry="8" fill="#000000" opacity="0.12" />
        </g>
        <circle cx="50" cy="50" r="46" fill="none" stroke={`hsla(${clampedHue}, 90%, 20%, 0.35)`} strokeWidth="1.5" />
      </svg>

      {trends.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2" aria-label="Trends">
          {trends.map((t, i) => (
            <span
              key={`${t.label}-${i}`}
              className="px-2 py-1 text-xs rounded-full border"
              data-hue={clampedHue}
              aria-label={`${t.label}: ${t.value}`}
            >
              {t.label}: {t.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
