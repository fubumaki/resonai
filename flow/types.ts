export type StepType = 'info' | 'drill' | 'reflection';

export interface FlowStepBase {
  id: string;
  type: StepType;
  title: string;
  next?: string; // id of next step
}

export interface InfoStep extends FlowStepBase {
  type: 'info';
  content: string;
}

export interface DrillTarget {
  pitchRange?: 'low' | 'mid' | 'high';
  intonation?: 'rising' | 'falling' | 'rise-fall';
  phraseText?: string;
}

export interface DrillStep extends FlowStepBase {
  type: 'drill';
  copy: string;
  durationSec?: number;
  target?: DrillTarget;
  metrics?: string[]; // e.g., ["timeInTargetPct","jitterEma","endRiseDetected"]
  successThreshold?: Record<string, number | boolean>;
}

export interface ReflectionStep extends FlowStepBase {
  type: 'reflection';
  copy: string;
  prompts: string[];
}

export interface FlowJson {
  version: number;
  flowName: string;
  steps: (InfoStep | DrillStep | ReflectionStep)[];
}
