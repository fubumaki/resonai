/**
 * Prosody Debug Exposure for Testing
 * Add this to your prosody labs when ?debug=1
 */

import { useEffect } from 'react';

// Prosody threshold types
interface ProsodyThresholds {
  jitterThreshold: number;
  loudnessThreshold: number;
  targetMissThreshold: number;
  confidenceThreshold: number;
  dtwTierThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  endRiseThreshold: number;
  rateLimitMs: number;
  antiRepeatMs: number;
}

// Global debug state
declare global {
  interface Window {
    __prosodyThresholds: Record<string, number>;
    __prosodyUpdateThresholds: (thresholds: Partial<ProsodyThresholds>) => void;
    __prosodyResetThresholds: () => void;
    __prosodyGetCurrentValues: () => {
      jitterEma: number;
      loudNorm: number;
      timeInTargetPct: number;
      confidence: number;
      dtwTier: number;
      endRiseDetected: boolean;
    };
  }
}

export function useProsodyDebugExposure() {
  useEffect(() => {
    // Only enable in debug mode
    const urlParams = new URLSearchParams(window.location.search);
    const isDebugMode = urlParams.get('debug') === '1';
    
    if (!isDebugMode) return;
    
    console.log('[Prosody Debug] Initializing threshold exposure...');
    
    // Default thresholds (matching CoachPolicyV2)
    const defaultThresholds: ProsodyThresholds = {
      jitterThreshold: 0.35,
      loudnessThreshold: 0.80,
      targetMissThreshold: 0.50,
      confidenceThreshold: 0.30,
      dtwTierThresholds: {
        excellent: 5,
        good: 4,
        fair: 3,
        poor: 2
      },
      endRiseThreshold: 0.5,
      rateLimitMs: 1000,
      antiRepeatMs: 4000
    };
    
    // Initialize global thresholds
    if (!window.__prosodyThresholds) {
      window.__prosodyThresholds = {
        jitterThreshold: defaultThresholds.jitterThreshold,
        loudnessThreshold: defaultThresholds.loudnessThreshold,
        targetMissThreshold: defaultThresholds.targetMissThreshold,
        confidenceThreshold: defaultThresholds.confidenceThreshold,
        endRiseThreshold: defaultThresholds.endRiseThreshold,
        rateLimitMs: defaultThresholds.rateLimitMs,
        antiRepeatMs: defaultThresholds.antiRepeatMs,
        dtwExcellent: defaultThresholds.dtwTierThresholds.excellent,
        dtwGood: defaultThresholds.dtwTierThresholds.good,
        dtwFair: defaultThresholds.dtwTierThresholds.fair,
        dtwPoor: defaultThresholds.dtwTierThresholds.poor
      };
    }
    
    // Update thresholds function
    window.__prosodyUpdateThresholds = (newThresholds: Partial<ProsodyThresholds>) => {
      Object.assign(window.__prosodyThresholds, newThresholds);
      console.log('[Prosody Debug] Thresholds updated:', window.__prosodyThresholds);
      
      // Notify coach system if available
      if ((window as any).coachSystem?.updateThresholds) {
        (window as any).coachSystem.updateThresholds(window.__prosodyThresholds);
      }
    };
    
    // Reset thresholds function
    window.__prosodyResetThresholds = () => {
      window.__prosodyThresholds = {
        jitterThreshold: defaultThresholds.jitterThreshold,
        loudnessThreshold: defaultThresholds.loudnessThreshold,
        targetMissThreshold: defaultThresholds.targetMissThreshold,
        confidenceThreshold: defaultThresholds.confidenceThreshold,
        endRiseThreshold: defaultThresholds.endRiseThreshold,
        rateLimitMs: defaultThresholds.rateLimitMs,
        antiRepeatMs: defaultThresholds.antiRepeatMs,
        dtwExcellent: defaultThresholds.dtwTierThresholds.excellent,
        dtwGood: defaultThresholds.dtwTierThresholds.good,
        dtwFair: defaultThresholds.dtwTierThresholds.fair,
        dtwPoor: defaultThresholds.dtwTierThresholds.poor
      };
      console.log('[Prosody Debug] Thresholds reset to defaults');
      
      // Notify coach system if available
      if ((window as any).coachSystem?.updateThresholds) {
        (window as any).coachSystem.updateThresholds(window.__prosodyThresholds);
      }
    };
    
    // Get current values function
    window.__prosodyGetCurrentValues = () => {
      // Try to get current values from the prosody system
      const prosodySystem = (window as any).prosodySystem;
      if (prosodySystem) {
        return {
          jitterEma: prosodySystem.getJitterEma?.() || 0,
          loudNorm: prosodySystem.getLoudNorm?.() || 0,
          timeInTargetPct: prosodySystem.getTimeInTargetPct?.() || 0,
          confidence: prosodySystem.getConfidence?.() || 0,
          dtwTier: prosodySystem.getDtwTier?.() || 0,
          endRiseDetected: prosodySystem.getEndRiseDetected?.() || false
        };
      }
      
      // Fallback to mock values for testing
      return {
        jitterEma: Math.random() * 0.5,
        loudNorm: Math.random() * 1.0,
        timeInTargetPct: Math.random() * 1.0,
        confidence: Math.random() * 1.0,
        dtwTier: Math.floor(Math.random() * 5) + 1,
        endRiseDetected: Math.random() > 0.5
      };
    };
    
    // Hook into actual prosody system if available
    const hookIntoProsodySystem = () => {
      const prosodySystem = (window as any).prosodySystem;
      if (prosodySystem) {
        console.log('[Prosody Debug] Hooking into prosody system...');
        
        // Override threshold updates
        if (prosodySystem.updateThresholds) {
          const originalUpdateThresholds = prosodySystem.updateThresholds;
          prosodySystem.updateThresholds = function(thresholds: ProsodyThresholds) {
            window.__prosodyThresholds = {
              jitterThreshold: thresholds.jitterThreshold,
              loudnessThreshold: thresholds.loudnessThreshold,
              targetMissThreshold: thresholds.targetMissThreshold,
              confidenceThreshold: thresholds.confidenceThreshold,
              endRiseThreshold: thresholds.endRiseThreshold,
              rateLimitMs: thresholds.rateLimitMs,
              antiRepeatMs: thresholds.antiRepeatMs,
              dtwExcellent: thresholds.dtwTierThresholds.excellent,
              dtwGood: thresholds.dtwTierThresholds.good,
              dtwFair: thresholds.dtwTierThresholds.fair,
              dtwPoor: thresholds.dtwTierThresholds.poor
            };
            console.log('[Prosody Debug] Thresholds synced from prosody system:', thresholds);
            return originalUpdateThresholds.call(this, thresholds);
          };
        }
        
        // Sync current thresholds
        if (prosodySystem.getThresholds) {
          const currentThresholds = prosodySystem.getThresholds();
          if (currentThresholds) {
            window.__prosodyThresholds = { ...currentThresholds };
            console.log('[Prosody Debug] Thresholds synced from prosody system:', currentThresholds);
          }
        }
      }
    };
    
    // Try to hook immediately and on DOM changes
    hookIntoProsodySystem();
    
    const observer = new MutationObserver(() => {
      hookIntoProsodySystem();
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Cleanup
    return () => {
      observer.disconnect();
      delete (window as any).__prosodyUpdateThresholds;
      delete (window as any).__prosodyResetThresholds;
      delete (window as any).__prosodyGetCurrentValues;
    };
  }, []);
}

// Export for manual use
export function initializeProsodyDebugExposure() {
  if (typeof window === 'undefined') return;
  
  console.log('[Prosody Debug] Manual initialization...');
  
  const defaultThresholds: ProsodyThresholds = {
    jitterThreshold: 0.35,
    loudnessThreshold: 0.80,
    targetMissThreshold: 0.50,
    confidenceThreshold: 0.30,
    dtwTierThresholds: {
      excellent: 5,
      good: 4,
      fair: 3,
      poor: 2
    },
    endRiseThreshold: 0.5,
    rateLimitMs: 1000,
    antiRepeatMs: 4000
  };
  
  if (!window.__prosodyThresholds) {
    window.__prosodyThresholds = {
      jitterThreshold: defaultThresholds.jitterThreshold,
      loudnessThreshold: defaultThresholds.loudnessThreshold,
      targetMissThreshold: defaultThresholds.targetMissThreshold,
      confidenceThreshold: defaultThresholds.confidenceThreshold,
      endRiseThreshold: defaultThresholds.endRiseThreshold,
      rateLimitMs: defaultThresholds.rateLimitMs,
      antiRepeatMs: defaultThresholds.antiRepeatMs,
      dtwExcellent: defaultThresholds.dtwTierThresholds.excellent,
      dtwGood: defaultThresholds.dtwTierThresholds.good,
      dtwFair: defaultThresholds.dtwTierThresholds.fair,
      dtwPoor: defaultThresholds.dtwTierThresholds.poor
    };
  }
  
  if (!window.__prosodyUpdateThresholds) {
    window.__prosodyUpdateThresholds = (newThresholds: Partial<ProsodyThresholds>) => {
      Object.assign(window.__prosodyThresholds, newThresholds);
    };
  }
  
  if (!window.__prosodyResetThresholds) {
    window.__prosodyResetThresholds = () => {
      window.__prosodyThresholds = {
        jitterThreshold: defaultThresholds.jitterThreshold,
        loudnessThreshold: defaultThresholds.loudnessThreshold,
        targetMissThreshold: defaultThresholds.targetMissThreshold,
        confidenceThreshold: defaultThresholds.confidenceThreshold,
        endRiseThreshold: defaultThresholds.endRiseThreshold,
        rateLimitMs: defaultThresholds.rateLimitMs,
        antiRepeatMs: defaultThresholds.antiRepeatMs,
        dtwExcellent: defaultThresholds.dtwTierThresholds.excellent,
        dtwGood: defaultThresholds.dtwTierThresholds.good,
        dtwFair: defaultThresholds.dtwTierThresholds.fair,
        dtwPoor: defaultThresholds.dtwTierThresholds.poor
      };
    };
  }
  
  if (!window.__prosodyGetCurrentValues) {
    window.__prosodyGetCurrentValues = () => ({
      jitterEma: Math.random() * 0.5,
      loudNorm: Math.random() * 1.0,
      timeInTargetPct: Math.random() * 1.0,
      confidence: Math.random() * 1.0,
      dtwTier: Math.floor(Math.random() * 5) + 1,
      endRiseDetected: Math.random() > 0.5
    });
  }
}

