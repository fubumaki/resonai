// src/coach/utils.ts
// Utility functions for the coach system

import { MetricSnapshot, MetricAggregation, DTWResult, CoachHint } from './types';

/**
 * Aggregate metrics from a series of snapshots
 */
export function aggregateMetrics(snapshots: MetricSnapshot[]): MetricAggregation {
  if (snapshots.length === 0) {
    return {
      avgJitterEma: 0,
      timeInTargetPct: 0,
      maxLoudness: 0,
      avgConfidence: 0,
      voicedTimePct: 0,
      durationMs: 0,
      sampleCount: 0
    };
  }

  const validSnapshots = snapshots.filter(s => s.t != null);
  if (validSnapshots.length === 0) {
    return {
      avgJitterEma: 0,
      timeInTargetPct: 0,
      maxLoudness: 0,
      avgConfidence: 0,
      voicedTimePct: 0,
      durationMs: 0,
      sampleCount: 0
    };
  }

  const jitterValues = validSnapshots
    .map(s => s.jitterEma)
    .filter((j): j is number => j != null && !isNaN(j));
  
  const targetValues = validSnapshots
    .map(s => s.timeInTarget)
    .filter((t): t is boolean => t != null);
  
  const loudnessValues = validSnapshots
    .map(s => s.loudNorm)
    .filter((l): l is number => l != null && !isNaN(l));
  
  const confidenceValues = validSnapshots
    .map(s => s.confidence)
    .filter((c): c is number => c != null && !isNaN(c));
  
  const voicedTimeValues = validSnapshots
    .map(s => s.voicedTimePct)
    .filter((v): v is number => v != null && !isNaN(v));

  const startTime = Math.min(...validSnapshots.map(s => s.t));
  const endTime = Math.max(...validSnapshots.map(s => s.t));

  return {
    avgJitterEma: jitterValues.length > 0 
      ? jitterValues.reduce((sum, j) => sum + j, 0) / jitterValues.length 
      : 0,
    timeInTargetPct: targetValues.length > 0 
      ? targetValues.filter(t => t).length / targetValues.length 
      : 0,
    maxLoudness: loudnessValues.length > 0 
      ? Math.max(...loudnessValues) 
      : 0,
    avgConfidence: confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length 
      : 0,
    voicedTimePct: voicedTimeValues.length > 0 
      ? voicedTimeValues.reduce((sum, v) => sum + v, 0) / voicedTimeValues.length 
      : 0,
    durationMs: endTime - startTime,
    sampleCount: validSnapshots.length
  };
}

/**
 * Calculate DTW tier based on semitone contour matching
 * This is a simplified version - in practice you'd use the full DTW algorithm
 */
export function calculateDTWTier(
  userContour: number[], 
  referenceContour: number[]
): DTWResult {
  if (userContour.length === 0 || referenceContour.length === 0) {
    return { tier: 1, avgDiff: 999, matchQuality: 'poor' };
  }

  // Simple average difference calculation
  // In practice, you'd use the full DTW algorithm from your intonation module
  const minLength = Math.min(userContour.length, referenceContour.length);
  let totalDiff = 0;
  let validSamples = 0;

  for (let i = 0; i < minLength; i++) {
    const userVal = userContour[i];
    const refVal = referenceContour[i];
    
    if (userVal != null && refVal != null && !isNaN(userVal) && !isNaN(refVal)) {
      totalDiff += Math.abs(userVal - refVal);
      validSamples++;
    }
  }

  if (validSamples === 0) {
    return { tier: 1, avgDiff: 999, matchQuality: 'poor' };
  }

  const avgDiff = totalDiff / validSamples;
  
  // Convert average difference to tier (1-5)
  let tier: 1 | 2 | 3 | 4 | 5;
  let matchQuality: 'poor' | 'fair' | 'good' | 'excellent';
  
  if (avgDiff <= 0.5) {
    tier = 5;
    matchQuality = 'excellent';
  } else if (avgDiff <= 1.0) {
    tier = 4;
    matchQuality = 'good';
  } else if (avgDiff <= 1.5) {
    tier = 3;
    matchQuality = 'fair';
  } else if (avgDiff <= 2.0) {
    tier = 2;
    matchQuality = 'poor';
  } else {
    tier = 1;
    matchQuality = 'poor';
  }

  return { tier, avgDiff, matchQuality };
}

/**
 * Throttle function calls to prevent too frequent updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

/**
 * Debounce function calls to wait for a pause in activity
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
}

/**
 * Check if a hint should be shown based on cooldown and priority
 */
export function shouldShowHint(
  hintId: string,
  lastHintTime: number,
  cooldownMs: number,
  currentTime: number
): boolean {
  return (currentTime - lastHintTime) >= cooldownMs;
}

/**
 * Generate a unique hint ID with timestamp
 */
export function generateHintId(baseId: string): string {
  return `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Filter hints by priority and remove duplicates
 */
export function filterHints(hints: CoachHint[]): CoachHint[] {
  // Remove duplicates by ID
  const seen = new Set<string>();
  const unique = hints.filter(hint => {
    if (seen.has(hint.id)) return false;
    seen.add(hint.id);
    return true;
  });

  // Sort by priority (higher first) and take top 2
  return unique
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 2);
}

/**
 * Create a metric snapshot from pitch engine output
 */
export function createMetricSnapshot(
  result: Record<string, unknown>,
  timestamp: number,
  timeInTarget?: boolean,
  endRiseDetected?: boolean
): MetricSnapshot {
  return {
    t: timestamp,
    pitchHz: result.pitchHz as number | null | undefined,
    semitoneRel: result.semitoneRel as number | null | undefined,
    jitterEma: (result as { metrics?: { jitterEma?: number } }).metrics?.jitterEma,
    timeInTarget,
    endRiseDetected,
    loudNorm: (result.loudNorm as number) || 0,
    confidence: (result as { raw?: { confidence?: number } }).raw?.confidence,
    voicedTimePct: result.voicedTimePct as number | undefined
  };
}
