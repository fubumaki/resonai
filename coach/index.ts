// src/coach/index.ts
// Export all coach system components

export * from './types';
export * from './copy';
export { CoachPolicyV2, type Clock, type Snapshot, type PhraseSummary } from './policyDefault';
export * from './priorityResolver';
export * from './utils';
export * from './useCoach';
export * from './CoachDisplay';
export * from './environmentAware';
export * from './CoachDebugHUD';
export * from './sloMonitor';
