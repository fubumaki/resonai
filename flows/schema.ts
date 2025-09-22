// flows/schema.ts
export type StepKind = 'info' | 'drill' | 'reflection';

export interface FlowV1 {
  version: 1;
  flowName: string;
  steps: Array<
    | { id: string; type: 'info'; title: string; content: string; next?: string }
    | {
        id: string;
        type: 'drill';
        title: string;
        copy: string;
        durationSec?: number;
        target?: {
          pitchRange?: ['low', 'high'];
          intonation?: 'rising' | 'falling';
          phraseText?: string;
        };
        metrics: Array<
          | 'voicedTimePct'
          | 'jitterEma'
          | 'timeInTargetPct'
          | 'smoothness'
          | 'endRiseDetected'
          | 'expressiveness'
        >;
        successThreshold?: Record<string, number | boolean>;
        next?: string;
      }
    | { id: string; type: 'reflection'; title: string; copy: string; prompts: string[] }
  >;
}

// Session summary interface for IndexedDB storage
export interface SessionSummary {
  id?: number;
  ts: number;
  medianF0: number | null;
  inBandPct?: number;
  prosodyVar?: number;
  voicedTimePct?: number;
  jitterEma?: number;
  comfort?: 1 | 2 | 3 | 4 | 5;
  fatigue?: 1 | 2 | 3 | 4 | 5;
  euphoria?: 1 | 2 | 3 | 4 | 5;
  orb?: string;
}

// Analytics event interface for OTLP forwarding
export interface AnalyticsEvent {
  event: string;
  props: Record<string, unknown>;
  ts: number;
  session_id: string;
  user_id?: string;
  variant?: string;
  schema: 'v1';
}

// Detector frame interface for real-time audio processing
export interface DetectorFrame {
  f0Hz: number | null;
  confidence: number;
  voiced: boolean;
  rms: number;
  centroidHz?: number;
}

// Flow runner state
export interface FlowState {
  currentStepId: string;
  stepStartTime: number;
  metrics: Record<string, number | boolean>;
  sessionId: string;
  isActive: boolean;
}

// Step execution result
export interface StepResult {
  stepId: string;
  duration: number;
  metrics: Record<string, number | boolean>;
  success: boolean;
  nextStepId?: string;
}
