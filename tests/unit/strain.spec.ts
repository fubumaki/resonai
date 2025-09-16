import { describe, it, expect } from 'vitest';
import { createStrainState, updateStrain } from '@/engine/audio/strain';
import { DEFAULT_STRAIN_THRESHOLDS } from '@/engine/audio/constants';

describe('strain guardrails', () => {
  it('recommends rest after continuous speaking threshold', () => {
    const thresholds = { ...DEFAULT_STRAIN_THRESHOLDS, maxContinuousSeconds: 5 };
    let s = createStrainState();
    s = updateStrain(s, { type: 'startRecording', atMs: 0 }, thresholds);
    // simulate 6 seconds speaking via ticks each second
    for (let t = 1000; t <= 6000; t += 1000) {
      s = updateStrain(s, { type: 'tick', atMs: t }, thresholds);
    }
    expect(s.recommendRest).toBe(true);
  });

  it('recommends lower intensity after daily budget exceeded', () => {
    const thresholds = { ...DEFAULT_STRAIN_THRESHOLDS, maxDailyMinutes: 0.1 };
    let s = createStrainState();
    s = updateStrain(s, { type: 'startRecording', atMs: 0 }, thresholds);
    // simulate 7 seconds (0.116min)
    for (let t = 1000; t <= 7000; t += 1000) {
      s = updateStrain(s, { type: 'tick', atMs: t }, thresholds);
    }
    expect(s.recommendLowerIntensity).toBe(true);
  });

  it('decays continuous counter when resting (off-mic)', () => {
    const thresholds = { ...DEFAULT_STRAIN_THRESHOLDS, maxContinuousSeconds: 5 };
    let s = createStrainState();
    s = updateStrain(s, { type: 'startRecording', atMs: 0 }, thresholds);
    for (let t = 1000; t <= 4000; t += 1000) s = updateStrain(s, { type: 'tick', atMs: t }, thresholds);
    s = updateStrain(s, { type: 'stopRecording', atMs: 4000 }, thresholds);
    // rest 3 seconds
    for (let t = 5000; t <= 7000; t += 1000) s = updateStrain(s, { type: 'tick', atMs: t }, thresholds);
    expect(s.continuousMs).toBe(0);
    expect(s.recommendRest).toBe(false);
  });
});


