import { describe, it, expect, beforeEach } from 'vitest';
import { CoachPolicyV2, type Clock, type Snapshot } from '../../src/coach/policyDefault';

// Simple fake clock for deterministic testing
const createFakeClock = (): Clock & { advance: (ms: number) => void } => {
  let time = 0;
  return {
    now: () => time,
    advance: (ms: number) => { time += ms; }
  };
};

describe('CoachPolicyV2', () => {
  let policy: CoachPolicyV2;
  let fake: Clock & { advance: (ms: number) => void };

  beforeEach(() => {
    fake = createFakeClock();
    policy = new CoachPolicyV2({ 
      clock: fake, 
      hopMs: 10,
      rateLimitMs: 1000,
      antiRepeatMs: 4000,
      dwellMsFirstHint: 0,
      dwellMsAfterFirst: 1000,
      loudnessThreshold: 0.80,
      loudWindowMs: 5000,
      targetCheckAfterMs: 15000,
      confidenceMinFrames: 100,
      confidenceThreshold: 0.30
    });
    policy.startStep();
  });

  describe('Rate limiting & anti-repeat', () => {
    it('should allow first hint immediately', () => {
      const history: Snapshot[] = [
        { t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 }
      ];
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(1);
      expect(hints[0].id).toBe('jitter');
    });

    it('should rate limit subsequent hints to 1 per second', () => {
      // First hint should fire
      const history1: Snapshot[] = [];
      for (let i = 0; i < 10; i++) {
        history1.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints1 = policy.realtime(history1);
      expect(hints1).toHaveLength(1);
      expect(hints1[0].id).toBe('jitter');

      // Next 900ms should be rate limited
      const history2: Snapshot[] = [...history1];
      for (let i = 0; i < 90; i++) {
        history2.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints2 = policy.realtime(history2);
      expect(hints2).toHaveLength(0);

      // After 4000ms total (anti-repeat), should allow again
      fake.advance(3000); // Total time now: 1000 + 100 + 3000 = 4100ms
      const history3: Snapshot[] = [...history2];
      for (let i = 0; i < 10; i++) {
        history3.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints3 = policy.realtime(history3);
      expect(hints3).toHaveLength(1);
      expect(hints3[0].id).toBe('jitter');
    });

    it('should prevent duplicate hint IDs within 4 seconds', () => {
      const history: Snapshot[] = [];
      
      // First jitter hint
      for (let i = 0; i < 10; i++) {
        history.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints1 = policy.realtime(history);
      expect(hints1).toHaveLength(1);
      expect(hints1[0].id).toBe('jitter');

      // Advance 1 second and try again - should be rate limited
      fake.advance(1000);
      for (let i = 0; i < 10; i++) {
        history.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints2 = policy.realtime(history);
      expect(hints2).toHaveLength(0); // Still rate limited

      // Advance another 3 seconds (4 total) - should allow jitter again
      fake.advance(3000);
      for (let i = 0; i < 10; i++) {
        history.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.5, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      const hints3 = policy.realtime(history);
      expect(hints3).toHaveLength(1);
      expect(hints3[0].id).toBe('jitter');
    });
  });

  describe('Safety outranks technique', () => {
    it('should prioritize loudness safety over jitter hints', () => {
      const history: Snapshot[] = [];
      
      // Create 5 seconds of high loudness + high jitter
      for (let i = 0; i < 500; i++) {
        history.push({ t: fake.now(), jitterEma: 0.5, loudNorm: 0.9, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(1);
      expect(hints[0].id).toBe('tooLoud');
      expect(hints[0].text).toContain('lighter');
    });
  });

  describe('Target miss vs confidence precedence', () => {
    it('should prefer target miss over confidence hints', () => {
      policy.startStep();
      const history: Snapshot[] = [];
      
      // 16 seconds elapsed, almost all out-of-band, confidence low too
      for (let i = 0; i < 1600; i++) {
        history.push({ 
          t: fake.now(), 
          timeInTargetHit: false, 
          confidence: 0.2,
          jitterEma: 0.2,
          loudNorm: 0.5
        });
        fake.advance(10);
      }
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(1);
      expect(hints[0].id).toBe('target');
      expect(hints[0].text).toContain('sweep');
    });
  });

  describe('Post-utterance feedback', () => {
    it('should prioritize praise for high DTW tiers', () => {
      const result1 = policy.postPhrase({ dtwTier: 5, endRiseDetected: false });
      expect(result1).toHaveLength(1);
      expect(result1[0].id).toBe('praise');
      expect(result1[0].text).toContain('Lovely');

      const result2 = policy.postPhrase({ dtwTier: 4, endRiseDetected: false });
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe('praise');
    });

    it('should show rise hint for low tiers without end rise', () => {
      const result = policy.postPhrase({ dtwTier: 2, endRiseDetected: false });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rise');
      expect(result[0].text).toContain('float up');
    });

    it('should show nudge for tier 3', () => {
      const result = policy.postPhrase({ dtwTier: 3, endRiseDetected: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('nudge');
      expect(result[0].text).toContain('shape');
    });

    it('should show retry for low tiers with end rise', () => {
      const result = policy.postPhrase({ dtwTier: 1, endRiseDetected: true });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('retry');
      expect(result[0].text).toContain('Good effort');
    });
  });

  describe('Loudness safety threshold', () => {
    it('should trigger safety hint after 5 seconds of high loudness', () => {
      policy.startStep();
      const history: Snapshot[] = [];
      
      // Create 5 seconds of high loudness
      for (let i = 0; i < 500; i++) {
        history.push({ t: fake.now(), loudNorm: 0.9, jitterEma: 0.2, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(1);
      expect(hints[0].id).toBe('tooLoud');
    });

    it('should not trigger safety hint for brief loudness spikes', () => {
      policy.startStep();
      const history: Snapshot[] = [];
      
      // Create 2 seconds of high loudness (below 5s threshold)
      for (let i = 0; i < 200; i++) {
        history.push({ t: fake.now(), loudNorm: 0.9, jitterEma: 0.2, timeInTargetHit: true, confidence: 0.8 });
        fake.advance(10);
      }
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(0);
    });
  });

  describe('Pre-lesson briefs', () => {
    it('should provide appropriate goals for different step types', () => {
      const warmupTips = policy.pre('SOVT Warm-Up');
      expect(warmupTips).toHaveLength(2);
      expect(warmupTips[0].id).toBe('goal-warmup');
      expect(warmupTips[1].id).toBe('setup');

      const glideTips = policy.pre('Glide Practice');
      expect(glideTips).toHaveLength(2);
      expect(glideTips[0].id).toBe('goal-glide');
      expect(glideTips[1].id).toBe('setup');

      const phraseTips = policy.pre('Prosody Phrase');
      expect(phraseTips).toHaveLength(2);
      expect(phraseTips[0].id).toBe('goal-phrase');
      expect(phraseTips[1].id).toBe('setup');
    });
  });

  describe('Empty/edge cases', () => {
    it('should return no hints for empty history', () => {
      const hints = policy.realtime([]);
      expect(hints).toHaveLength(0);
    });

    it('should return no hints for unvoiced frames', () => {
      const history: Snapshot[] = [
        { t: fake.now(), loudNorm: 0.1, jitterEma: undefined, timeInTargetHit: false, confidence: 0.1 }
      ];
      
      const hints = policy.realtime(history);
      expect(hints).toHaveLength(0);
    });
  });
});