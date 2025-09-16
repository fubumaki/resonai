(() => {
  if (typeof window === 'undefined') return;

  const DEFAULT_TOTAL_STEPS = 10;
  const globalWindow = window;

  function sanitizeTotalSteps(totalSteps, fallback) {
    const total = Number(totalSteps ?? fallback);
    if (!Number.isFinite(total) || total <= 0) {
      return fallback;
    }
    return Math.max(1, Math.round(total));
  }

  function clampCompletedSteps(value, totalSteps) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    const rounded = Math.round(numeric);
    return Math.min(Math.max(rounded, 0), totalSteps);
  }

  const existingState =
    typeof globalWindow.__getPracticeHooksState === 'function'
      ? globalWindow.__getPracticeHooksState()
      : globalWindow.__practiceHooksState ?? {};

  const state = existingState;

  if (typeof state.totalSteps === 'number') {
    state.totalSteps = sanitizeTotalSteps(state.totalSteps, DEFAULT_TOTAL_STEPS);
  }

  if (typeof state.progress === 'number') {
    const clampTotal = typeof state.totalSteps === 'number'
      ? state.totalSteps
      : DEFAULT_TOTAL_STEPS;
    state.progress = clampCompletedSteps(state.progress, clampTotal);
  }

  const defaultSetReady = (value) => {
    state.ready = !!value;
  };

  const defaultSetProgress = (value, options) => {
    const candidateTotal =
      options && typeof options.totalSteps === 'number'
        ? options.totalSteps
        : state.totalSteps;
    const totalSteps = sanitizeTotalSteps(candidateTotal, DEFAULT_TOTAL_STEPS);
    state.totalSteps = totalSteps;
    state.progress = clampCompletedSteps(value, totalSteps);
    if (options && Object.prototype.hasOwnProperty.call(options, 'announcementPrefix')) {
      state.announcementPrefix = options.announcementPrefix;
    }
  };

  state.defaultSetReady = defaultSetReady;
  state.defaultSetProgress = defaultSetProgress;

  if (typeof globalWindow.__setPracticeReady !== 'function') {
    globalWindow.__setPracticeReady = defaultSetReady;
  }
  if (typeof globalWindow.__setPracticeProgress !== 'function') {
    globalWindow.__setPracticeProgress = defaultSetProgress;
  }

  globalWindow.__practiceHooksState = state;
  globalWindow.__getPracticeHooksState = () => state;
})();
