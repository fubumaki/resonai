export function dtwAvgSemitoneDiff(ref: number[], usr: number[]): number {
  const N = ref.length, M = usr.length;
  const INF = 1e9;
  const cost = Array.from({length: N + 1}, () => new Float64Array(M + 1).fill(INF));
  cost[0][0] = 0;
  
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const d = Math.abs(ref[i-1] - usr[j-1]); // semitone difference
      const minPrev = Math.min(cost[i-1][j], cost[i][j-1], cost[i-1][j-1]);
      cost[i][j] = d + minPrev;
    }
  }
  
  const pathLen = N + M ? (N + M) / 2 : 1;
  return cost[N][M] / pathLen;
}

export type MatchTier = 1|2|3|4|5;

export function tierFromAvgDiff(avgDiffSemi: number): MatchTier {
  // Tunable thresholds (semitones). Calibrate with your kit.
  if (avgDiffSemi < 0.5) return 5;       // Excellent
  if (avgDiffSemi < 1.5) return 4;       // Good
  if (avgDiffSemi < 3.0) return 3;       // Fair
  if (avgDiffSemi < 5.0) return 2;       // Needs practice
  return 1;                               // Try again
}
