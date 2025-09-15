"use client";
export default function TargetBar({
  value, min, max, tmin, tmax,
}: { value: number | null; min: number; max: number; tmin: number; tmax: number }) {
  const norm = (v: number) => ((v - min) / (max - min)) * 100;
  const zoneX = Math.max(0, Math.min(100, norm(tmin)));
  const zoneW = Math.max(1, Math.min(100, norm(tmax) - norm(tmin)));
  const markerX = value == null ? null : Math.max(0, Math.min(100, norm(value)));

  return (
    <svg viewBox="0 0 100 8" className="target-svg" aria-label="Target range">
      <rect x="0" y="0" width="100" height="8" rx="4" className="track" />
      <rect x={zoneX} y="0" width={zoneW} height="8" rx="4" className="zone" />
      {markerX != null && <rect x={markerX - 1.6} y="-3" width="3.2" height="14" rx="1.6" className="marker" />}
    </svg>
  );
}
