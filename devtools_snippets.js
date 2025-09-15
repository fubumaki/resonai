/**
 * DevTools Snippets for Resonai Coach System Testing
 * Copy and paste these into your browser's DevTools Console
 * to test specific functionality and gather evidence
 */

// ============================================================================
// 1. ISOLATION PROOF
// ============================================================================

// Check cross-origin isolation status
console.log('=== ISOLATION CHECK ===');
console.log('crossOriginIsolated:', window.crossOriginIsolated);
console.log('SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');
console.log('AudioWorklet available:', typeof AudioWorklet !== 'undefined');

// Check COOP/COEP headers
fetch(window.location.href, { method: 'HEAD' })
  .then(response => {
    console.log('COOP:', response.headers.get('cross-origin-opener-policy'));
    console.log('COEP:', response.headers.get('cross-origin-embedder-policy'));
  })
  .catch(console.error);

// ============================================================================
// 2. DEVICE-FLIP RESILIENCE
// ============================================================================

// Monitor device changes
console.log('=== DEVICE MONITORING ===');
let deviceChangeCount = 0;

navigator.mediaDevices.ondevicechange = () => {
  deviceChangeCount++;
  console.log(`Device change detected #${deviceChangeCount}`);
  
  // Check current settings
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      console.log('New device settings:', settings);
      
      // Check sample rate
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('AudioContext sample rate:', audioContext.sampleRate);
      console.log('Settings sample rate:', settings.sampleRate);
      console.log('Sample rates match:', audioContext.sampleRate === settings.sampleRate);
      
      audioContext.close();
      stream.getTracks().forEach(track => track.stop());
    })
    .catch(console.error);
};

// Start monitoring
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('Initial device settings:', stream.getAudioTracks()[0].getSettings());
    stream.getTracks().forEach(track => track.stop());
  })
  .catch(console.error);

// ============================================================================
// 3. COACH POLICY INVARIANTS
// ============================================================================

// Monitor coach hints (if debug hooks are available)
console.log('=== COACH POLICY MONITORING ===');

if (typeof window.__coachEmits !== 'undefined') {
  console.log('Coach debug hooks available');
  
  // Monitor hint emissions
  const originalEmits = window.__coachEmits;
  window.__coachEmits = [];
  
  // Override push to log emissions
  const originalPush = Array.prototype.push;
  Array.prototype.push = function(...items) {
    const result = originalPush.apply(this, items);
    console.log('Coach hint emitted:', items);
    return result;
  };
  
  // Restore original push
  setTimeout(() => {
    Array.prototype.push = originalPush;
  }, 10000);
  
} else {
  console.log('Coach debug hooks not available - enable ?coachhud=1');
}

// ============================================================================
// 4. PROSODY FAIRNESS & ANTI-GAMING
// ============================================================================

// Monitor prosody thresholds (if available)
console.log('=== PROSODY MONITORING ===');

if (typeof window.__prosodyThresholds !== 'undefined') {
  console.log('Current prosody thresholds:', window.__prosodyThresholds);
  
  // Monitor threshold changes
  const originalThresholds = window.__prosodyThresholds;
  Object.defineProperty(window, '__prosodyThresholds', {
    get: () => originalThresholds,
    set: (newThresholds) => {
      console.log('Prosody thresholds updated:', newThresholds);
      Object.assign(originalThresholds, newThresholds);
    }
  });
} else {
  console.log('Prosody thresholds not available - enable ?debug=1');
}

// ============================================================================
// 5. LOUDNESS GUARD CALIBRATION
// ============================================================================

// Monitor loudness levels
console.log('=== LOUDNESS MONITORING ===');

let loudnessReadings = [];
let maxLoudness = 0;

// Create audio context for monitoring
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;

// Get microphone input
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    function monitorLoudness() {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (root mean square) for loudness
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLoudness = rms / 255;
      
      loudnessReadings.push({
        timestamp: Date.now(),
        loudness: normalizedLoudness,
        rms: rms
      });
      
      maxLoudness = Math.max(maxLoudness, normalizedLoudness);
      
      // Check if above threshold
      if (normalizedLoudness >= 0.8) {
        console.warn(`Loudness threshold exceeded: ${normalizedLoudness.toFixed(3)}`);
      }
      
      // Keep only last 100 readings
      if (loudnessReadings.length > 100) {
        loudnessReadings.shift();
      }
    }
    
    // Monitor every 100ms
    const interval = setInterval(monitorLoudness, 100);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      console.log('Loudness monitoring complete');
      console.log('Max loudness:', maxLoudness.toFixed(3));
      console.log('Average loudness:', (loudnessReadings.reduce((sum, r) => sum + r.loudness, 0) / loudnessReadings.length).toFixed(3));
      console.log('Readings above 0.8:', loudnessReadings.filter(r => r.loudness >= 0.8).length);
      
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
    }, 30000);
  })
  .catch(console.error);

// ============================================================================
// 6. PRIVACY & A11Y VISIBILITY
// ============================================================================

// Monitor network requests
console.log('=== PRIVACY MONITORING ===');

const networkRequests = [];
const originalFetch = window.fetch;

window.fetch = function(...args) {
  networkRequests.push({
    url: args[0],
    method: 'GET',
    timestamp: Date.now()
  });
  return originalFetch.apply(this, args);
};

// Monitor XMLHttpRequest
const originalXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function() {
  const xhr = new originalXHR();
  const originalOpen = xhr.open;
  
  xhr.open = function(method, url, ...args) {
    networkRequests.push({
      url,
      method,
      timestamp: Date.now()
    });
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  return xhr;
};

// Check for aria-live regions
console.log('=== A11Y CHECK ===');
const ariaLiveRegions = document.querySelectorAll('[aria-live]');
console.log('Aria-live regions found:', ariaLiveRegions.length);
ariaLiveRegions.forEach((region, index) => {
  console.log(`Region ${index + 1}:`, {
    element: region.tagName,
    ariaLive: region.getAttribute('aria-live'),
    textContent: region.textContent?.trim().substring(0, 50) + '...'
  });
});

// Check for proper labeling
const labeledElements = document.querySelectorAll('[aria-label], [aria-labelledby]');
console.log('Labeled elements found:', labeledElements.length);

// Check focus management
console.log('=== FOCUS CHECK ===');
const focusableElements = document.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
console.log('Focusable elements found:', focusableElements.length);

// Test keyboard navigation
console.log('Press Tab to test keyboard navigation...');
let focusOrder = [];
document.addEventListener('focusin', (e) => {
  focusOrder.push({
    tagName: e.target.tagName,
    id: e.target.id,
    className: e.target.className,
    textContent: e.target.textContent?.trim().substring(0, 30)
  });
  console.log('Focus moved to:', e.target.tagName, e.target.id || e.target.className);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Export data for QA snapshot
window.exportQAData = function() {
  return {
    isolation: {
      crossOriginIsolated: window.crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      audioWorklet: typeof AudioWorklet !== 'undefined'
    },
    deviceChanges: deviceChangeCount,
    coachEmissions: window.__coachEmits || [],
    prosodyThresholds: window.__prosodyThresholds || {},
    loudnessReadings: loudnessReadings,
    maxLoudness: maxLoudness,
    networkRequests: networkRequests,
    a11y: {
      ariaLiveRegions: ariaLiveRegions.length,
      labeledElements: labeledElements.length,
      focusableElements: focusableElements.length
    },
    focusOrder: focusOrder
  };
};

console.log('=== QA DATA EXPORT ===');
console.log('Run exportQAData() to get all collected data for QA snapshot');

// ============================================================================
// CLEANUP
// ============================================================================

// Cleanup function
window.cleanupQAMonitoring = function() {
  // Restore original functions
  window.fetch = originalFetch;
  window.XMLHttpRequest = originalXHR;
  
  // Clear intervals
  if (typeof interval !== 'undefined') {
    clearInterval(interval);
  }
  
  console.log('QA monitoring cleaned up');
};

console.log('=== MONITORING ACTIVE ===');
console.log('Run cleanupQAMonitoring() to stop monitoring');
console.log('Run exportQAData() to get collected data');

