// src/coach/priorityResolver.ts
// Single source of truth for hint priority resolution

import { CoachHint } from './types';
// Priority resolver is now integrated into CoachPolicyV2
// This file is kept for backward compatibility but functionality is moved to policyDefault.ts

export interface HintCandidate {
  bucket: string;
  hint: CoachHint;
  timestamp: number;
}

export class PriorityResolver {
  private lastHintAt = 0;
  private lastHintId: string | null = null;
  private lastTargetMissAt = 0;
  private lastJitterAt = 0;

  /**
   * Resolve hint candidates into a single hint based on priority
   * @param candidates Array of hint candidates from different buckets
   * @param isPhraseEnd Whether this is end of phrase (changes priority order)
   * @param nowMs Current timestamp
   * @returns Single hint or null if rate limited
   */
  resolve(
    candidates: HintCandidate[], 
    isPhraseEnd: boolean = false, 
    nowMs: number = performance.now()
  ): CoachHint | null {
    // Rate limiting - max 1 hint per second (but allow first hint)
    if (this.lastHintAt > 0 && nowMs - this.lastHintAt < 1000) {
      return null;
    }

    // Use appropriate priority order (simplified for backward compatibility)
    const priorityOrder = isPhraseEnd ? ['praise', 'env', 'safety', 'technique'] : ['safety', 'env', 'technique', 'praise'];

    // Find highest priority hint
    for (const bucket of priorityOrder) {
      const candidate = candidates.find(c => c.bucket === bucket);
      if (candidate) {
        // Check anti-repeat cooldown
        if (this.lastHintId === candidate.hint.id && 
            (nowMs - this.lastHintAt) < 4000) {
          continue;
        }

        // Check bucket-specific cooldowns
        if (bucket === 'technique') {
          if (candidate.hint.id === 'target' && 
              this.lastTargetMissAt > 0 && (nowMs - this.lastTargetMissAt) < 12000) {
            continue;
          }
          if (candidate.hint.id === 'jitter' && 
              this.lastJitterAt > 0 && (nowMs - this.lastJitterAt) < 1000) {
            continue;
          }
        }

        // Update tracking
        this.lastHintAt = nowMs;
        this.lastHintId = candidate.hint.id;
        
        if (candidate.hint.id === 'target') {
          this.lastTargetMissAt = nowMs;
        }
        if (candidate.hint.id === 'jitter') {
          this.lastJitterAt = nowMs;
        }

        return candidate.hint;
      }
    }

    return null;
  }

  /**
   * Create a hint candidate
   */
  static createCandidate(
    bucket: string, 
    hint: CoachHint, 
    timestamp: number = performance.now()
  ): HintCandidate {
    return { bucket, hint, timestamp };
  }

  /**
   * Reset internal state (useful for testing)
   */
  reset(): void {
    this.lastHintAt = 0;
    this.lastHintId = null;
    this.lastTargetMissAt = 0;
    this.lastJitterAt = 0;
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      lastHintAt: this.lastHintAt,
      lastHintId: this.lastHintId,
      lastTargetMissAt: this.lastTargetMissAt,
      lastJitterAt: this.lastJitterAt,
      timeSinceLastHint: performance.now() - this.lastHintAt
    };
  }
}
