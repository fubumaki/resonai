import { Smoother, Hz } from '../types';

/** Convert Hz<->semitones around a baseline; baseline may drift slowly outside */
const hzToSemi = (hz: Hz, baselineHz: Hz) => 12 * Math.log2(hz / baselineHz);
const semiToHz = (semi: number, baselineHz: Hz) => baselineHz * Math.pow(2, semi / 12);

/**
 * 1-D Kalman on semitone values with simple re-prime on voiced starts.
 * State: x (semitones), P variance.
 */
export default class Kalman1D implements Smoother {
  private x: number | null = null;
  private P = 0;
  private framesSinceVoiced = 0;
  private readonly q: number; // process noise semitones^2 per frame
  private readonly r: number; // measurement noise semitones^2 per frame
  private readonly fastLockFrames: number;
  private baselineHz: Hz;

  constructor(opts: { qSemitones2: number; rSemitones2: number; fastLockFrames: number; baselineHz: Hz }) {
    this.q = opts.qSemitones2;
    this.r = opts.rSemitones2;
    this.fastLockFrames = opts.fastLockFrames;
    this.baselineHz = opts.baselineHz;
  }

  reset(): void {
    this.x = null;
    this.P = 0;
    this.framesSinceVoiced = 0;
  }

  /** Update baseline slowly (for relative view / drift). Call externally if you maintain a rolling median. */
  setBaselineHz(hz: Hz) { 
    this.baselineHz = hz; 
  }

  update(pitchHz: Hz | null, isVoiced: boolean): Hz | null {
    if (!isVoiced || pitchHz == null || !isFinite(pitchHz)) {
      // No measurement; decay confidence and return null
      this.framesSinceVoiced = 0;
      return null;
    }

    const z = hzToSemi(pitchHz, this.baselineHz); // measurement in semitones

    if (this.x == null) {
      // Prime filter on new voiced segment for fast lock
      this.x = z;
      this.P = this.r; // start with measurement variance
      this.framesSinceVoiced = 1;
      return semiToHz(this.x, this.baselineHz);
    }

    // Predict: x' = x; P' = P + q
    const xPred = this.x;
    const Ppred = this.P + this.q;

    // Measurement update
    const K = Ppred / (Ppred + this.r);
    // Fast-lock: during first N voiced frames, overweight measurement slightly
    const Kfast = (this.framesSinceVoiced < this.fastLockFrames) ? Math.min(1, K * 1.6) : K;

    const xNew = xPred + Kfast * (z - xPred);
    const Pnew = (1 - Kfast) * Ppred;

    this.x = xNew;
    this.P = Pnew;
    this.framesSinceVoiced++;

    return semiToHz(this.x, this.baselineHz);
  }
}
