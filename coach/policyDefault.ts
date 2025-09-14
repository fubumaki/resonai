// SPDX-License-Identifier: MIT
import { COPY } from './copy';

// ---------- Deterministic time source ----------
export interface Clock { now(): number }
const PerfClock: Clock = { now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) };

// ---------- Types ----------
export type CoachHint = { id: string; text: string; aria?: string; severity?: 'info'|'success'|'gentle' };
export type Snapshot = {
  t: number;                  // ms timestamp for this frame
  loudNorm?: number;          // 0..1
  jitterEma?: number;         // lower is smoother
  timeInTargetHit?: boolean;  // true if current frame is "in band"
  // optional extras your tests may set
  confidence?: number;        // 0..1
};

export type PhraseSummary = { dtwTier?: 1|2|3|4|5; endRiseDetected?: boolean };

type Bucket = 'safety'|'env'|'technique-target'|'technique-confidence'|'praise';

interface PolicyOpts {
  hopMs?: number;                 // default 10
  clock?: Clock;                  // testable time
  rateLimitMs?: number;           // default 1000
  antiRepeatMs?: number;          // default 4000
  dwellMsFirstHint?: number;      // default 0 (first hint can fire immediately)
  dwellMsAfterFirst?: number;     // default 1000
  loudnessThreshold?: number;     // default 0.80
  loudWindowMs?: number;          // default 5000
  targetCheckAfterMs?: number;    // default 15000 (glide)
  confidenceMinFrames?: number;   // default 100 frames (~1s at 10ms)
  confidenceThreshold?: number;   // default 0.30
}

export class CoachPolicyV2 {
  private opts: Required<PolicyOpts>;
  private clock: Clock;
  private stepStartedAt = -1;
  private lastHintAt = -Infinity;
  private lastById = new Map<string, number>();

  constructor(opts: PolicyOpts = {}) {
    this.opts = {
      hopMs: opts.hopMs ?? 10,
      clock: opts.clock ?? PerfClock,
      rateLimitMs: opts.rateLimitMs ?? 1000,
      antiRepeatMs: opts.antiRepeatMs ?? 4000,
      dwellMsFirstHint: opts.dwellMsFirstHint ?? 0,
      dwellMsAfterFirst: opts.dwellMsAfterFirst ?? 1000,
      loudnessThreshold: opts.loudnessThreshold ?? 0.80,
      loudWindowMs: opts.loudWindowMs ?? 5000,
      targetCheckAfterMs: opts.targetCheckAfterMs ?? 15000,
      confidenceMinFrames: opts.confidenceMinFrames ?? 100,
      confidenceThreshold: opts.confidenceThreshold ?? 0.30,
    };
    this.clock = this.opts.clock;
  }

  /** Call at the start of every step (warmup/glide/phrase). */
  startStep() {
    this.stepStartedAt = this.clock.now();
    this.lastHintAt = -Infinity;
    this.lastById.clear();
  }

  /** Pre‑lesson tips */
  pre(stepTitle: string): CoachHint[] {
    const tips: CoachHint[] = [];
    // Simple keyword mapping; you already standardized titles in your flows.
    const lower = stepTitle.toLowerCase();
    if (lower.includes('phrase')) tips.push({ id:'goal-phrase', text: COPY.goalPhrase });
    else if (lower.includes('glide')) tips.push({ id:'goal-glide', text: COPY.goalGlide });
    else if (lower.includes('warm')) tips.push({ id:'goal-warmup', text: COPY.goalWarmup });

    tips.push({ id:'setup', text: COPY.setup }); // Windows mic guidance + headphones
    return tips;
  }

  /** Real‑time micro‑hints (≤1/sec, safety > env > target > confidence). */
  realtime(history: Snapshot[]): CoachHint[] {
    if (this.stepStartedAt < 0) this.startStep();
    const now = this.clock.now();
    const hints: { bucket: Bucket; hint: CoachHint }[] = [];

    // ---- Rate limit (first hint never blocked) ----
    const sinceLast = now - this.lastHintAt;
    const dwellNeeded = (this.lastHintAt === -Infinity) ? this.opts.dwellMsFirstHint : this.opts.dwellMsAfterFirst;
    if (sinceLast < this.opts.rateLimitMs || (now - this.stepStartedAt) < dwellNeeded) return [];

    const tail = history.length ? history[history.length-1] : undefined;
    if (!tail) return [];

    // ---- SAFETY: loudness over moving time window ----
    const windowStart = now - this.opts.loudWindowMs;
    let loudMs = 0;
    for (let i = history.length-1; i >= 0; i--) {
      const s = history[i];
      if (s.t < windowStart) break;
      const nextT = (i === history.length-1 ? now : history[i+1].t);
      const dt = Math.max(0, nextT - s.t);
      if ((s.loudNorm ?? 0) >= this.opts.loudnessThreshold) loudMs += dt;
    }
    if (loudMs >= this.opts.loudWindowMs) {
      this.add(hints, 'safety', { id:'tooLoud', text: COPY.tooLoud, severity:'gentle' });
      return this.resolve(hints, now); // safety beats all
    }

    // ---- TECHNIQUE: glide smoothness (jitter) ----
    if ((tail.jitterEma ?? 0) > 0.35) {
      this.add(hints, 'technique-target', { id:'jitter', text: COPY.jitter });
    }

    // ---- TECHNIQUE: target miss (time-in-target low after 15s) ----
    const elapsedMs = now - this.stepStartedAt;
    if (elapsedMs >= this.opts.targetCheckAfterMs) {
      const inTargetCount = history.filter(h => h.timeInTargetHit === true).length;
      const ratio = inTargetCount / Math.max(1, history.length);
      if (ratio < 0.5) this.add(hints, 'technique-target', { id:'target', text: COPY.target });
    }

    // ---- TECHNIQUE(confidence): advisory (only if NO target hint chosen) ----
    // Fire only when low confidence sustains AND no other technique-target hint exists.
    if (!hints.find(h => h.bucket === 'technique-target')) {
      const lastN = history.slice(-this.opts.confidenceMinFrames);
      if (lastN.length >= this.opts.confidenceMinFrames) {
        const avgConf = average(lastN.map(s => s.confidence ?? 1));
        if (avgConf < this.opts.confidenceThreshold) {
          this.add(hints, 'technique-confidence', { id:'confidence', text: COPY.confidence });
        }
      }
    }

    return this.resolve(hints, now);
  }

  /** End‑of‑phrase: one‑liner, praise‑first, rise if missing. */
  postPhrase(res: PhraseSummary): CoachHint[] {
    // Phrase end shows exactly one line; prefer praise, then rise, then nudge/retry.
    if (res.dtwTier != null && res.dtwTier >= 4) {
      return [{ id:'praise', text: COPY.praise, severity:'success' }];
    }
    if (res.endRiseDetected === false) {
      return [{ id:'rise', text: COPY.rise }];
    }
    if (res.dtwTier === 3) return [{ id:'nudge', text: COPY.nudge }];
    return [{ id:'retry', text: COPY.retry }];
  }

  /** Compatibility method for ICoachPolicy interface */
  post(agg: { 
    dtwTier?: number; 
    endRiseDetected?: boolean; 
    stats: Record<string, unknown>;
    stepType?: string;
  }): CoachHint[] {
    return this.postPhrase({
      dtwTier: agg.dtwTier as 1|2|3|4|5|undefined,
      endRiseDetected: agg.endRiseDetected
    });
  }

  // ---------- helpers ----------
  private add(arr: {bucket:Bucket; hint:CoachHint}[], bucket:Bucket, hint:CoachHint) {
    arr.push({ bucket, hint });
  }

  private resolve(candidates: {bucket:Bucket; hint:CoachHint}[], now: number): CoachHint[] {
    if (!candidates.length) return [];
    const ORDER: Bucket[] = ['safety','env','technique-target','technique-confidence','praise'];

    for (const bucket of ORDER) {
      const cand = candidates.find(c => c.bucket === bucket);
      if (!cand) continue;
      // per‑ID anti‑repeat (initial state should not block)
      const lastIdAt = this.lastById.get(cand.hint.id) ?? -Infinity;
      if ((now - lastIdAt) < this.opts.antiRepeatMs) continue;

      // accept
      this.lastHintAt = now;
      this.lastById.set(cand.hint.id, now);
      return [cand.hint];
    }
    return [];
  }
}

function average(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a,b)=>a+b,0) / xs.length;
}