interface SafetyState { 
  hotMs: number; 
  lastTs: number | null; 
}

const safety: SafetyState = { hotMs: 0, lastTs: null };

/**
 * Call this once per UI tick with normalized loudness 0..1 and timestamp t (ms).
 * Returns true when cooldown should be suggested.
 */
export function updateSafety(loudNorm: number, tMs: number): boolean {
  if (safety.lastTs == null) { 
    safety.lastTs = tMs; 
    return false; 
  }
  
  const dt = Math.max(0, tMs - safety.lastTs); 
  safety.lastTs = tMs;
  
  const tooLoud = loudNorm > 0.8; // tune if needed
  safety.hotMs = tooLoud ? safety.hotMs + dt : Math.max(0, safety.hotMs - 2*dt);
  
  return safety.hotMs > 5000; // suggest cooldown after ~5s in the red
}

export function resetSafety(): void {
  safety.hotMs = 0;
  safety.lastTs = null;
}
