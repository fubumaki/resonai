/**
 * Coach Debug Hooks for Testing
 * Add this to your /coach-demo page when ?coachhud=1&debug=1
 */

import { useEffect } from 'react';

// Debug hook types
interface CoachEmission {
  hintId: string;
  text: string;
  timestamp: number;
  bucket?: string;
  severity?: string;
}

interface CoachDebugState {
  emissions: CoachEmission[];
  thresholds: Record<string, number>;
  canSimulate: boolean;
  lastHintTime: number;
  rateLimitStatus: {
    isRateLimited: boolean;
    timeUntilNext: number;
  };
}

// Global debug state
declare global {
  interface Window {
    __coachEmits: { hintId: string; text: string; timestamp: number; bucket?: string }[];
    __coachSimulate: (eventType: string, data: any) => void;
    __coachDebugState: () => CoachDebugState;
    __coachClearEmissions: () => void;
  }
}

export function useCoachDebugHooks() {
  useEffect(() => {
    // Only enable in debug mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('coachhud') === '1' && urlParams.get('debug') === '1';
    
    if (!isDebugMode) return;
    
    console.log('[Coach Debug] Initializing debug hooks...');
    
    // Initialize global debug state
    if (!window.__coachEmits) {
      window.__coachEmits = [];
    }
    
    // Coach simulation function
    window.__coachSimulate = (eventType: string, data: any) => {
      console.log(`[Coach Debug] Simulating ${eventType}:`, data);
      
      const timestamp = Date.now();
      let hint: CoachEmission | null = null;
      
      switch (eventType) {
        case 'phraseEnd':
          if (data.dtwTier >= 4) {
            hint = {
              hintId: 'praise',
              text: 'Lovely contour match! One more for consistency.',
              timestamp,
              bucket: 'praise',
              severity: 'success'
            };
          } else if (data.dtwTier === 3) {
            hint = {
              hintId: 'nudge',
              text: 'You\'ve got the shape—add a touch more lift at the end.',
              timestamp,
              bucket: 'praise',
              severity: 'gentle'
            };
          } else {
            hint = {
              hintId: 'retry',
              text: 'Good effort—try again with a gentler start then a small rise.',
              timestamp,
              bucket: 'praise',
              severity: 'gentle'
            };
          }
          break;
          
        case 'realtime':
          if (data.jitterEma > 0.35) {
            hint = {
              hintId: 'jitter',
              text: 'Slow the glide—imagine drawing one line.',
              timestamp,
              bucket: 'technique-target',
              severity: 'gentle'
            };
          } else if (data.loudNorm > 0.8) {
            hint = {
              hintId: 'tooLoud',
              text: 'Take a breath—make it a little lighter?',
              timestamp,
              bucket: 'safety',
              severity: 'gentle'
            };
          }
          break;
          
        case 'targetMiss':
          hint = {
            hintId: 'target',
            text: 'Try a slower, smaller sweep—stay inside the band.',
            timestamp,
            bucket: 'technique-target',
            severity: 'gentle'
          };
          break;
          
        case 'confidence':
          hint = {
            hintId: 'confidence',
            text: 'Let the tone settle—start gently, keep it steady.',
            timestamp,
            bucket: 'technique-confidence',
            severity: 'gentle'
          };
          break;
      }
      
      if (hint) {
        window.__coachEmits.push(hint);
        console.log('[Coach Debug] Hint emitted:', hint);
      }
    };
    
    // Debug state getter
    window.__coachDebugState = (): CoachDebugState => {
      const now = Date.now();
      const lastEmission = window.__coachEmits[window.__coachEmits.length - 1];
      const lastHintTime = lastEmission?.timestamp || 0;
      const timeSinceLastHint = now - lastHintTime;
      
      return {
        emissions: [...window.__coachEmits],
        thresholds: window.__prosodyThresholds || {},
        canSimulate: true,
        lastHintTime,
        rateLimitStatus: {
          isRateLimited: timeSinceLastHint < 1000, // 1 second rate limit
          timeUntilNext: Math.max(0, 1000 - timeSinceLastHint)
        }
      };
    };
    
    // Clear emissions function
    window.__coachClearEmissions = () => {
      window.__coachEmits = [];
      console.log('[Coach Debug] Emissions cleared');
    };
    
    // Hook into actual coach system if available
    const hookIntoCoachSystem = () => {
      // Look for coach system in the DOM or global scope
      const coachSystem = (window as any).coachSystem;
      if (coachSystem && typeof coachSystem.emitHint === 'function') {
        console.log('[Coach Debug] Hooking into coach system...');
        
        // Override emitHint to track emissions
        const originalEmitHint = coachSystem.emitHint;
        coachSystem.emitHint = function(hint: any) {
          const emission: CoachEmission = {
            hintId: hint.id || hint.hintId,
            text: hint.text,
            timestamp: Date.now(),
            bucket: hint.bucket,
            severity: hint.severity
          };
          
          window.__coachEmits.push(emission);
          console.log('[Coach Debug] Real hint emitted:', emission);
          
          return originalEmitHint.call(this, hint);
        };
      }
    };
    
    // Try to hook immediately and on DOM changes
    hookIntoCoachSystem();
    
    const observer = new MutationObserver(() => {
      hookIntoCoachSystem();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Cleanup
    return () => {
      observer.disconnect();
      delete (window as any).__coachSimulate;
      delete (window as any).__coachDebugState;
      delete (window as any).__coachClearEmissions;
    };
  }, []);
}

// Export for manual use
export function initializeCoachDebugHooks() {
  if (typeof window === 'undefined') return;
  
  console.log('[Coach Debug] Manual initialization...');
  
  if (!window.__coachEmits) {
    window.__coachEmits = [];
  }
  
  if (!window.__coachSimulate) {
    window.__coachSimulate = (eventType: string, data: any) => {
      console.log(`[Coach Debug] Manual simulation ${eventType}:`, data);
    };
  }
  
  if (!window.__coachDebugState) {
    window.__coachDebugState = () => ({
      emissions: window.__coachEmits || [],
      thresholds: window.__prosodyThresholds || {},
      canSimulate: true,
      lastHintTime: 0,
      rateLimitStatus: {
        isRateLimited: false,
        timeUntilNext: 0
      }
    });
  }
  
  if (!window.__coachClearEmissions) {
    window.__coachClearEmissions = () => {
      window.__coachEmits = [];
    };
  }
}

