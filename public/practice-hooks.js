(() => {
  const global = window;
  const state = global.__practiceHooksState ?? {
    readyValue: undefined,
    progressValue: undefined,
    progressOptions: undefined,
    readyHandler: undefined,
    progressHandler: undefined,
    bootstrapReady: undefined,
    bootstrapProgress: undefined,
  };

  global.__practiceHooksState = state;

  const cacheReady = (value) => {
    state.readyValue = Boolean(value);
    if (typeof state.readyHandler === "function") {
      state.readyHandler(state.readyValue);
    }
  };

  const cacheProgress = (value, options) => {
    state.progressValue = value;
    state.progressOptions = options;
    if (typeof state.progressHandler === "function") {
      state.progressHandler(value, options);
    }
  };

  state.bootstrapReady = cacheReady;
  state.bootstrapProgress = cacheProgress;

  global.__setPracticeReady = cacheReady;
  global.__setPracticeProgress = cacheProgress;
})();
