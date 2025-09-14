// Deterministic 0..1 bucket for a string key (djb2-style hash)
export function bucketPct(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) + key.charCodeAt(i);
  // Convert to unsigned 32-bit and normalize
  return ((h >>> 0) % 10_000) / 10_000;
}
