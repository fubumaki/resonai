(function () {
  if (typeof window === "undefined") {
    return;
  }

  const global = window;
  const CACHE_KEY = "__practiceHookCache";
  const READY_EVENT = "practice:set-ready";
  const PROGRESS_EVENT = "practice:set-progress";
  const REQUEST_EVENT = "practice:request-cache";

  const clampProgress = (value, totalSteps) => {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }

    let safeValue = Math.round(numeric);
    if (safeValue < 0) {
      safeValue = 0;
    }

    if (typeof totalSteps === "number" && Number.isFinite(totalSteps)) {
      const maxSteps = Math.max(0, Math.round(totalSteps));
      if (safeValue > maxSteps) {
        safeValue = maxSteps;
      }
    }

    return safeValue;
  };

  const ensureCache = () => {
    const existing = global[CACHE_KEY];
    if (existing && typeof existing === "object") {
      return existing;
    }

    const created = {
      ready: undefined,
      progress: undefined,
      progressOptions: undefined,
    };
    global[CACHE_KEY] = created;
    return created;
  };

  const cache = ensureCache();

  const dispatch = (eventName, detail) => {
    try {
      global.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch {
      // Ignore environments without CustomEvent support.
    }
  };

  const setReady = (value) => {
    const safeValue = !!value;
    cache.ready = safeValue;
    dispatch(READY_EVENT, safeValue);
  };

  const setProgress = (value, options) => {
    const hasTotal = options && typeof options.totalSteps === "number" && Number.isFinite(options.totalSteps);
    const totalSteps = hasTotal ? Math.max(0, Math.round(options.totalSteps)) : undefined;
    const safeValue = clampProgress(value, totalSteps);

    cache.progress = safeValue;
    if (options && (hasTotal || typeof options.announcementPrefix === "string")) {
      cache.progressOptions = {
        totalSteps,
        announcementPrefix: options.announcementPrefix,
      };
    } else {
      cache.progressOptions = undefined;
    }

    dispatch(PROGRESS_EVENT, safeValue);
  };

  global.__setPracticeReady = setReady;
  global.__setPracticeProgress = setProgress;

  global.addEventListener(REQUEST_EVENT, () => {
    if (typeof cache.ready === "boolean") {
      dispatch(READY_EVENT, cache.ready);
    }
    if (typeof cache.progress === "number") {
      dispatch(PROGRESS_EVENT, cache.progress);
    }
  });
})();
