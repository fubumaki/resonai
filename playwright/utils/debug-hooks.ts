/**
 * Debug hooks for testing the Resonai Coach System
 * These are injected into the page during testing to provide
 * visibility into internal state and behavior
 */

declare global {
  interface Window {
    __coachEmits: Array<{
      hintId: string;
      text: string;
      timestamp: number;
      bucket?: string;
    }>;
    __prosodyThresholds: Record<string, number>;
    __coachSimulate: (eventType: string, data: any) => void;
    __networkRequests: Array<{
      url: string;
      method: string;
      timestamp: number;
    }>;
  }
}

/**
 * Initialize debug hooks for testing
 */
export function initializeDebugHooks(): void {
  if (typeof window === 'undefined') return;

  // Coach emissions tracking
  window.__coachEmits = [];

  // Prosody thresholds
  window.__prosodyThresholds = {};

  // Network request tracking
  window.__networkRequests = [];

  // Coach simulation
  window.__coachSimulate = (eventType: string, data: any) => {
    console.log(`[DEBUG] Simulating coach event: ${eventType}`, data);
    
    // This would integrate with the actual coach system
    // For now, just log the event
    if (eventType === 'phraseEnd') {
      const hint = {
        hintId: data.dtwTier >= 4 ? 'praise' : 'nudge',
        text: data.dtwTier >= 4 ? 'Lovely contour match!' : 'Add a touch more lift',
        timestamp: Date.now(),
        bucket: 'praise'
      };
      window.__coachEmits.push(hint);
    }
  };

  // Override fetch to track network requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    window.__networkRequests.push({
      url: args[0] as string,
      method: 'GET',
      timestamp: Date.now()
    });
    return originalFetch.apply(this, args);
  };

  // Override XMLHttpRequest to track network requests
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    xhr.open = function(method: string, url: string, ...args: any[]) {
      window.__networkRequests.push({
        url,
        method,
        timestamp: Date.now()
      });
      return originalOpen.apply(this, [method, url, true, null, null]);
    };
    return xhr;
  } as any;

  console.log('[DEBUG] Debug hooks initialized');
}

/**
 * Clean up debug hooks
 */
export function cleanupDebugHooks(): void {
  if (typeof window === 'undefined') return;

  delete (window as any).__coachEmits;
  delete (window as any).__prosodyThresholds;
  delete (window as any).__coachSimulate;
  delete (window as any).__networkRequests;

  console.log('[DEBUG] Debug hooks cleaned up');
}

/**
 * Hook into coach system to track emissions
 * This would be called by the actual coach system
 */
export function trackCoachEmission(hint: {
  id: string;
  text: string;
  bucket?: string;
}): void {
  if (typeof window === 'undefined' || !window.__coachEmits) return;

  window.__coachEmits.push({
    hintId: hint.id,
    text: hint.text,
    timestamp: Date.now(),
    bucket: hint.bucket
  });
}

/**
 * Update prosody thresholds
 */
export function updateProsodyThresholds(thresholds: Record<string, number>): void {
  if (typeof window === 'undefined' || !window.__prosodyThresholds) return;

  Object.assign(window.__prosodyThresholds, thresholds);
}

