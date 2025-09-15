/**
 * Compute slope (semitones/sec) over the last windowMs of voiced frames.
 * semis[] are semitone-relative values; times[] are seconds aligned to those frames.
 */
export function endRiseDetected(semis: number[], times: number[], windowMs = 300, minSlope = 4): boolean {
  if (semis.length < 4) return false;
  
  const tEnd = times[times.length - 1];
  const keep: number[] = [];
  const x: number[] = [];
  
  for (let i = semis.length - 1; i >= 0; i--) {
    if ((tEnd - times[i]) * 1000 <= windowMs) { 
      keep.push(semis[i]); 
      x.push(times[i]); 
    } else {
      break;
    }
  }
  
  if (keep.length < 4) return false;
  
  // Linear regression y = a + b t
  const n = keep.length;
  const sumT = x.reduce((s,v)=>s+v,0);
  const sumY = keep.reduce((s,v)=>s+v,0);
  const sumTT = x.reduce((s,v)=>s+v*v,0);
  const sumTY = keep.reduce((s,v,i)=>s+x[i]*v,0);
  const denom = n*sumTT - sumT*sumT;
  
  if (denom === 0) return false;
  
  const slope = (n*sumTY - sumT*sumY)/denom; // semitones per second
  return slope >= minSlope; // ≥ ~1.2 semitones over last 300 ms → gentle rise
}
