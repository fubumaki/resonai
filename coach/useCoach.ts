// src/coach/useCoach.ts
// React hook for the Guiding AI Trainer

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  CoachState, 
  CoachConfig, 
  CoachHint, 
  MetricSnapshot, 
  SessionSummary,
} from './types';
import { CoachPolicyV2 } from './policyDefault';
import { 
  aggregateMetrics, 
  throttle, 
  shouldShowHint, 
  filterHints,
  createMetricSnapshot 
} from './utils';
import { EnvironmentAwareCoach, EnvironmentState } from './environmentAware';
import { sloMonitor } from './sloMonitor';

const DEFAULT_CONFIG: CoachConfig = {
  maxHintsPerSecond: 1,
  hintCooldownMs: 1000,
  maxHistoryLength: 1000,
  enableAria: true,
  policy: new CoachPolicyV2()
};

export function useCoach(config: Partial<CoachConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<CoachState>({
    currentHints: [],
    lastHintTime: 0,
    sessionStartTime: Date.now(),
    stepStartTime: Date.now(),
    metricsHistory: [],
    isActive: false
  });

  const sessionSummaryRef = useRef<SessionSummary | null>(null);
  const stepResultsRef = useRef<Array<{
    stepId: string;
    stepType: string;
    success: boolean;
    metrics: Record<string, unknown>;
    hints: CoachHint[];
  }>>([]);

  // Environment awareness
  const environmentCoachRef = useRef<EnvironmentAwareCoach>(new EnvironmentAwareCoach());
  const [environmentState, setEnvironmentState] = useState<EnvironmentState>({
    isIsolated: false,
    deviceChanged: false,
    enhancementsOn: false,
    audioContextState: 'closed',
    sampleRate: 48000
  });

  // Throttled realtime hint generation
  const generateRealtimeHints = useCallback(
    throttle((...args: unknown[]) => {
      const snapshots = args[0] as MetricSnapshot[];
      if (!state.isActive) return;

      // Check environment first
      const environmentHints = environmentCoachRef.current.checkEnvironment(environmentState);
      
      // Get regular coaching hints
      const hints = finalConfig.policy.realtime(snapshots as MetricSnapshot[]);
      const allHints = [...environmentHints, ...hints];
      const filteredHints = filterHints(allHints);
      
      if (filteredHints.length > 0) {
        const currentTime = Date.now();
        const validHints = filteredHints.filter(hint => 
          shouldShowHint(hint.id, state.lastHintTime, finalConfig.hintCooldownMs, currentTime)
        );

        if (validHints.length > 0) {
          // Record hint for SLO monitoring
          validHints.forEach(hint => {
            sloMonitor.recordHint(hint, 'realtime');
          });
          
          setState(prev => ({
            ...prev,
            currentHints: validHints,
            lastHintTime: currentTime
          }));
        }
      }
    }, 1000 / finalConfig.maxHintsPerSecond),
    [state.isActive, state.lastHintTime, finalConfig, environmentState]
  );

  // Start coaching session
  const startSession = useCallback((flowName: string) => {
    setState(prev => ({
      ...prev,
      isActive: true,
      sessionStartTime: Date.now(),
      stepStartTime: Date.now(),
      metricsHistory: [],
      currentHints: []
    }));

    sessionSummaryRef.current = {
      flowName,
      startTime: Date.now(),
      endTime: 0,
      stepResults: [],
      totalHints: 0
    };
  }, []);

  // Start new step
  const startStep = useCallback((stepId: string, stepType: string, step: Record<string, unknown>) => {
    setState(prev => ({
      ...prev,
      stepStartTime: Date.now(),
      metricsHistory: [],
      currentHints: []
    }));

    // Generate pre-step hints
    const preHints = finalConfig.policy.pre(stepType);
    if (preHints.length > 0) {
      setState(prev => ({
        ...prev,
        currentHints: preHints
      }));
    }
  }, [finalConfig.policy]);

  // Add metric snapshot
  const addMetricSnapshot = useCallback((snapshot: MetricSnapshot) => {
    setState(prev => {
      const newHistory = [...prev.metricsHistory, snapshot];
      // Keep only the last maxHistoryLength snapshots
      const trimmedHistory = newHistory.slice(-finalConfig.maxHistoryLength);
      
      // Generate realtime hints
      generateRealtimeHints(trimmedHistory);
      
      return {
        ...prev,
        metricsHistory: trimmedHistory
      };
    });
  }, [generateRealtimeHints, finalConfig.maxHistoryLength]);

  // End step and generate post-step feedback
  const endStep = useCallback((
    stepId: string, 
    stepType: string, 
    success: boolean,
    additionalMetrics?: Record<string, unknown>
  ) => {
    const currentTime = Date.now();
    
    // Aggregate metrics for this step
    const aggregated = aggregateMetrics(state.metricsHistory);
    
    // Generate post-step hints
    const postHints = finalConfig.policy.post({
      dtwTier: additionalMetrics?.dtwTier as number | undefined,
      endRiseDetected: additionalMetrics?.endRiseDetected as boolean | undefined,
      stats: { ...aggregated, ...additionalMetrics },
      stepType
    });

    const filteredPostHints = filterHints(postHints);

    // Store step results
    const stepResult = {
      stepId,
      stepType,
      success,
      metrics: {
        ...aggregated,
        ...additionalMetrics
      },
      hints: [...state.currentHints, ...filteredPostHints]
    };

    stepResultsRef.current.push(stepResult);

    // Update session summary
    if (sessionSummaryRef.current) {
      sessionSummaryRef.current.stepResults = [...stepResultsRef.current];
      sessionSummaryRef.current.totalHints += filteredPostHints.length;
    }

    // Record post-step hints for SLO monitoring
    filteredPostHints.forEach(hint => {
      sloMonitor.recordHint(hint, stepId);
    });
    
    // Record phrase attempt for praise rate monitoring
    if (stepType === 'drill' && additionalMetrics?.dtwTier) {
      const gotPraise = filteredPostHints.some(hint => hint.id === 'praise' || hint.id === 'rise-success');
      sloMonitor.recordPhraseAttempt(additionalMetrics?.dtwTier as number || 0, gotPraise);
    }

    // Show post-step hints
    if (filteredPostHints.length > 0) {
      setState(prev => ({
        ...prev,
        currentHints: filteredPostHints
      }));
    }

    return stepResult;
  }, [state.metricsHistory, state.stepStartTime, state.currentHints, finalConfig.policy]);

  // End entire session
  const endSession = useCallback(() => {
    const currentTime = Date.now();
    
    if (sessionSummaryRef.current) {
      sessionSummaryRef.current.endTime = currentTime;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      currentHints: []
    }));

    return sessionSummaryRef.current;
  }, []);

  // Clear current hints
  const clearHints = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentHints: []
    }));
  }, []);

  // Get current hints for display
  const getCurrentHints = useCallback(() => {
    return state.currentHints;
  }, [state.currentHints]);

  // Get session summary
  const getSessionSummary = useCallback(() => {
    return sessionSummaryRef.current;
  }, []);

  // Check environment periodically
  const checkEnvironment = useCallback(async () => {
    const newState = await EnvironmentAwareCoach.getEnvironmentState();
    setEnvironmentState(prev => ({
      ...prev,
      ...newState
    }));
  }, []);

  // Check environment on mount and periodically
  useEffect(() => {
    checkEnvironment();
    const interval = setInterval(checkEnvironment, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [checkEnvironment]);

  // Check if coach is active
  const isActive = state.isActive;

  return {
    // State
    currentHints: state.currentHints,
    isActive,
    environmentState,
    
    // Actions
    startSession,
    startStep,
    addMetricSnapshot,
    endStep,
    endSession,
    clearHints,
    checkEnvironment,
    
    // Getters
    getCurrentHints,
    getSessionSummary,
    
    // Utilities
    createMetricSnapshot: (result: Record<string, unknown>, timestamp: number, timeInTarget?: boolean, endRiseDetected?: boolean) =>
      createMetricSnapshot(result, timestamp, timeInTarget, endRiseDetected),
    
    // SLO Monitoring
    getSLOMetrics: () => sloMonitor.getMetrics(),
    checkSLOs: () => sloMonitor.checkSLOs(),
    getSLOSummary: () => sloMonitor.getSummary(),
    resetSLOMonitor: () => sloMonitor.reset()
  };
}

// Hook for managing ARIA announcements
export function useCoachAria() {
  const [announcement, setAnnouncement] = useState<string>('');

  const announce = useCallback((text: string) => {
    setAnnouncement(text);
    // Clear after a short delay to allow re-announcement of same text
    setTimeout(() => setAnnouncement(''), 100);
  }, []);

  const announceHint = useCallback((hint: CoachHint) => {
    if (hint.aria) {
      announce(hint.aria);
    } else {
      announce(hint.text);
    }
  }, [announce]);

  return {
    announcement,
    announce,
    announceHint
  };
}
