// src/coach/types.ts
// Types for the Guiding AI Trainer system

export type CoachMoment = 'pre' | 'realtime' | 'post';

export interface MetricSnapshot {
  t: number;                    // ms since start
  pitchHz?: number | null;
  semitoneRel?: number | null;
  jitterEma?: number;           // lower is smoother
  timeInTarget?: boolean;       // per-frame target adherence
  endRiseDetected?: boolean;    // phrase end detection
  dtwTier?: 1 | 2 | 3 | 4 | 5;  // post-phrase DTW match quality
  loudNorm?: number;            // 0..1 normalized loudness
  confidence?: number;          // pitch detection confidence
  voicedTimePct?: number;       // percentage of time voiced
}

export interface CoachHint {
  id: string;
  text: string;
  severity?: 'info' | 'success' | 'gentle' | 'warning';
  aria?: string;                // optional ARIA announcement
  priority?: number;            // 1-5, higher = more important
}

// Re-export types from policyDefault for compatibility
export type { Snapshot, PhraseSummary, Clock } from './policyDefault';

export interface ICoachPolicy {
  pre(stepTitle: string): CoachHint[];                                    // priming tips
  realtime(snapshots: MetricSnapshot[]): CoachHint[];                     // micro-hints
  post(agg: { 
    dtwTier?: number; 
    endRiseDetected?: boolean; 
    stats: Record<string, unknown>;
    stepType?: string;
  }): CoachHint[];                                                        // summary advice
}

export interface CoachState {
  currentHints: CoachHint[];
  lastHintTime: number;
  sessionStartTime: number;
  stepStartTime: number;
  metricsHistory: MetricSnapshot[];
  isActive: boolean;
}

export interface CoachConfig {
  maxHintsPerSecond: number;    // throttle realtime hints
  hintCooldownMs: number;       // minimum time between hints
  maxHistoryLength: number;     // keep last N snapshots
  enableAria: boolean;          // announce hints via ARIA
  policy: ICoachPolicy;          // the coaching policy to use
}

export interface SessionSummary {
  flowName: string;
  startTime: number;
  endTime: number;
  stepResults: Array<{
    stepId: string;
    stepType: string;
    success: boolean;
    metrics: {
      avgJitterEma?: number;
      timeInTargetPct?: number;
      endRiseDetected?: boolean;
      dtwTier?: number;
      maxLoudness?: number;
    };
    hints: CoachHint[];
  }>;
  totalHints: number;
  adaptiveNotes?: string[];     // notes for next session
}

// Helper types for metric aggregation
export interface MetricAggregation {
  avgJitterEma: number;
  timeInTargetPct: number;
  maxLoudness: number;
  avgConfidence: number;
  voicedTimePct: number;
  durationMs: number;
  sampleCount: number;
}

// DTW tier calculation result
export interface DTWResult {
  tier: 1 | 2 | 3 | 4 | 5;
  avgDiff: number;
  matchQuality: 'poor' | 'fair' | 'good' | 'excellent';
}
