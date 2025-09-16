(function bootstrapPracticeHooks() {
  const root = typeof window === 'undefined' ? undefined : window;
  if (!root) {
    return;
  }

  const DEFAULT_TOTAL_STEPS = 10;

  const sanitizeTotalSteps = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }
    const rounded = Math.round(value);
    return rounded < 0 ? 0 : rounded;
  };

  const sanitizeProgress = (value, totalSteps) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    const rounded = Math.round(value);
    const max = typeof totalSteps === 'number' ? totalSteps : DEFAULT_TOTAL_STEPS;
    if (rounded < 0) return 0;
    if (rounded > max) return max;
    return rounded;
  };

  const existingState = root.__practiceHooksState ?? {};
  const initialTotalSteps = sanitizeTotalSteps(existingState.totalSteps) ?? DEFAULT_TOTAL_STEPS;
  const hooksState = {
    ready: typeof existingState.ready === 'boolean' ? existingState.ready : undefined,
    progress:
      typeof existingState.progress === 'number' && Number.isFinite(existingState.progress)
        ? sanitizeProgress(existingState.progress, initialTotalSteps)
        : undefined,
    totalSteps: initialTotalSteps,
    announcementPrefix:
      typeof existingState.announcementPrefix === 'string' ? existingState.announcementPrefix : undefined,
  };

  const getPracticeHooksState = () => hooksState;

  const readInitialPracticeReady = () => hooksState.ready;

  const readInitialPracticeProgress = () => hooksState.progress;

  const setPracticeReady = (value) => {
    hooksState.ready = !!value;
    try {
      root.dispatchEvent(new CustomEvent('practice:set-ready', { detail: hooksState.ready }));
    } catch (error) {
      // ignore dispatch errors (e.g., server-like environments)
    }
    return hooksState.ready;
  };

  const setPracticeProgress = (value, options = {}) => {
    const totalSteps = sanitizeTotalSteps(options.totalSteps) ?? hooksState.totalSteps ?? DEFAULT_TOTAL_STEPS;
    hooksState.totalSteps = totalSteps;
    hooksState.progress = sanitizeProgress(value, totalSteps);
    hooksState.announcementPrefix = options.announcementPrefix;
    try {
      root.dispatchEvent(new CustomEvent('practice:set-progress', { detail: hooksState.progress }));
    } catch (error) {
      // ignore dispatch errors (e.g., server-like environments)
    }
    return hooksState.progress;
  };

  root.__practiceHooksState = hooksState;
  root.getPracticeHooksState = getPracticeHooksState;
  root.readInitialPracticeReady = readInitialPracticeReady;
  root.readInitialPracticeProgress = readInitialPracticeProgress;
  root.__setPracticeReady = setPracticeReady;
  root.__setPracticeProgress = setPracticeProgress;
})();
