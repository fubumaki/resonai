'use client';

import React, { useState } from 'react';
import PitchBandDrill from '@/components/drills/PitchBandDrill';

export default function PitchBandLab() {
  const [currentHz, setCurrentHz] = useState<number | null>(null);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pitch Band Drill (Lab)</h1>

      <div className="flex items-center gap-3" role="group" aria-label="Pitch controls">
        <label htmlFor="hz-input" className="text-sm">Current Hz</label>
        <input
          id="hz-input"
          type="number"
          className="border rounded px-2 py-1"
          inputMode="numeric"
          aria-label="Set current pitch in hertz"
          onChange={(e) => setCurrentHz(e.target.value ? Number(e.target.value) : null)}
        />
      </div>

      <PitchBandDrill targetHz={200} toleranceHz={10} currentHz={currentHz} />
    </main>
  );
}


