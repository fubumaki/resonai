import { DEFAULT_STRAIN_THRESHOLDS, StrainThresholds } from './constants';

export type StrainEvent =
  | { type: 'startRecording'; atMs: number }
  | { type: 'stopRecording'; atMs: number }
  | { type: 'tick'; atMs: number };

export type StrainState = {
  totalSessionMs: number;
  totalDayMs: number;
  continuousMs: number;
  lastEventAtMs: number | null;
  recording: boolean;
  recommendRest: boolean;
  recommendLowerIntensity: boolean;
};

export function createStrainState(): StrainState {
  return {
    totalSessionMs: 0,
    totalDayMs: 0,
    continuousMs: 0,
    lastEventAtMs: null,
    recording: false,
    recommendRest: false,
    recommendLowerIntensity: false,
  };
}

export function updateStrain(
  state: StrainState,
  event: StrainEvent,
  thresholds: StrainThresholds = DEFAULT_STRAIN_THRESHOLDS
): StrainState {
  const next = { ...state };
  const now = event.atMs;
  const delta = state.lastEventAtMs != null ? Math.max(0, now - state.lastEventAtMs) : 0;

  if (event.type === 'tick') {
    if (state.recording) {
      next.totalSessionMs += delta;
      next.totalDayMs += delta;
      next.continuousMs += delta;
    } else {
      // Off-mic: decay continuous load faster than accumulation to encourage rests
      const decayFactor = 2; // rest twice as effective as continuous accumulation
      next.continuousMs = Math.max(0, next.continuousMs - decayFactor * delta);
    }
  } else if (event.type === 'startRecording') {
    next.recording = true;
  } else if (event.type === 'stopRecording') {
    next.recording = false;
  }

  next.lastEventAtMs = now;

  // Recommendations
  next.recommendRest =
    next.continuousMs >= thresholds.maxContinuousSeconds * 1000 ||
    next.totalSessionMs >= thresholds.maxSessionMinutes * 60_000;

  next.recommendLowerIntensity =
    next.totalDayMs >= thresholds.maxDailyMinutes * 60_000;

  return next;
}


