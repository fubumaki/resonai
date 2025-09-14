"use client";
export default function Meter({ level }: { level: number }) {
  const pct = Math.min(1, Math.max(0, level)) * 100;
  return (
    <svg
      viewBox="0 0 100 8"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={Number((pct / 100).toFixed(2))}
      className="meter-svg"
    >
      <rect x="0" y="0" width="100" height="8" rx="4" className="meter-bg" />
      <rect x="0" y="0" width={pct} height="8" rx="4" className="meter-fill" />
    </svg>
  );
}
