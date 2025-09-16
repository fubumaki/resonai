import React from 'react';

type PitchBandDrillProps = {
  targetHz: number;
  toleranceHz: number;
  currentHz?: number | null;
};

export function PitchBandDrill({ targetHz, toleranceHz, currentHz = null }: PitchBandDrillProps) {
  const inBand = typeof currentHz === 'number' && Math.abs(currentHz - targetHz) <= toleranceHz;
  const deviation = typeof currentHz === 'number' ? Math.abs(currentHz - targetHz) : null;

  return (
    <section aria-labelledby="pitch-band-heading">
      <h2 id="pitch-band-heading" className="sr-only">Pitch Band Drill</h2>
      <div className="grid gap-2" role="group" aria-label="Pitch band target">
        <svg className="target-svg" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="0" width="100" height="8" fill="currentColor" opacity="0.1" />
          <rect x={45} y={0} width={10} height={8} fill="currentColor" opacity="0.4" />
        </svg>
        <div role="status" aria-live="polite">
          {currentHz == null ? (
            <span>Waiting for pitch…</span>
          ) : inBand ? (
            <span>In band. Deviation {deviation?.toFixed(0)} Hz.</span>
          ) : (
            <span>Out of band. Deviation {deviation?.toFixed(0)} Hz.</span>
          )}
        </div>
      </div>
    </section>
  );
}

export default PitchBandDrill;


