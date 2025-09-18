(function initSessionProgressGlobals() {
  if (typeof window === 'undefined') {
    return;
  }

  if (typeof window.__resetSessionProgress !== 'function') {
    window.__resetSessionProgress = function () {
      if (typeof window.__resetSessionProgressImpl === 'function') {
        window.__resetSessionProgressImpl();
      }
    };
  }

  if (typeof window.__getSessionProgress !== 'function') {
    window.__getSessionProgress = function () {
      return typeof window.__getSessionProgressImpl === 'function'
        ? window.__getSessionProgressImpl()
        : [];
    };
  }

  if (typeof window.__trackSessionProgress !== 'function') {
    window.__trackSessionProgress = function (stepCount, totalSteps) {
      return typeof window.__trackSessionProgressImpl === 'function'
        ? window.__trackSessionProgressImpl(stepCount, totalSteps)
        : {};
    };
  }
})();
