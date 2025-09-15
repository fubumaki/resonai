import type { PitchDetector, PitchFrame } from '../types';

export default class YinDetector implements PitchDetector {
  readonly name = 'YIN (JS)';
  private threshold = 0.1; // typical YIN threshold
  private minHz = 60;
  private maxHz = 800;

  async initialize(): Promise<void> { /* no-op */ }
  reset(): void { /* no-op */ }

  processFrame(frame: Float32Array, sampleRate: number): PitchFrame {
    const tauMin = Math.floor(sampleRate / this.maxHz);
    const tauMax = Math.floor(sampleRate / this.minHz);
    const yin = new Float32Array(tauMax);
    yin.fill(0);

    // Difference function
    for (let tau = 1; tau < tauMax; tau++) {
      let sum = 0;
      for (let i = 0; i < frame.length - tau; i++) {
        const d = frame[i] - frame[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }

    // Cumulative mean normalized difference
    yin[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < tauMax; tau++) {
      runningSum += yin[tau];
      yin[tau] = runningSum ? (yin[tau] * tau) / runningSum : 1;
    }

    // Absolute threshold
    let tau = -1;
    for (let t = tauMin; t < tauMax; t++) {
      if (yin[t] < this.threshold) { 
        tau = t; 
        break; 
      }
    }
    if (tau === -1) return { pitchHz: null, confidence: 0 };

    // Parabolic interpolation around tau for better estimate
    const t0 = Math.max(1, tau - 1), t1 = tau, t2 = Math.min(tau + 1, tauMax - 1);
    const s0 = yin[t0], s1 = yin[t1], s2 = yin[t2];
    const denom = (s2 + s0 - 2 * s1);
    const betterTau = tau + (denom ? (s2 - s0) / (2 * denom) : 0);

    const hz = sampleRate / betterTau;
    const confidence = 1 - yin[tau];
    return { pitchHz: hz, confidence: Math.max(0, Math.min(1, confidence)) };
  }
}
