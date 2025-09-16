import { analytics, type AnalyticsEvent } from '@/lib/analytics';
import { calculateTrainingSessionProgress } from '@/lib/progress';

export type SessionProgressProps = Record<'step_count' | 'total_steps' | 'progress_percent', number>;

export type SessionProgressEvent = AnalyticsEvent & { props: SessionProgressProps };

const sessionProgressEvents: SessionProgressEvent[] = [];

function cloneEvent(event: SessionProgressEvent): SessionProgressEvent {
  return {
    ...event,
    props: { ...event.props },
  };
}

export function trackSessionProgress(stepCount: number, totalSteps: number): SessionProgressEvent {
  const progress = calculateTrainingSessionProgress(stepCount, totalSteps);
  const props: SessionProgressProps = {
    step_count: progress.safeStep,
    total_steps: progress.safeTotal,
    progress_percent: progress.percent,
  };

  const tracked = analytics.track('session_progress', props) as SessionProgressEvent;
  const event: SessionProgressEvent = {
    ...tracked,
    props,
  };
  sessionProgressEvents.push(cloneEvent(event));
  return event;
}

export function resetSessionProgressEvents(): void {
  sessionProgressEvents.length = 0;
}

export function getSessionProgressEvents(): SessionProgressEvent[] {
  return sessionProgressEvents.map(cloneEvent);
}

declare global {
  interface Window {
    __resetSessionProgress?: () => void;
    __getSessionProgress?: () => SessionProgressEvent[];
    __trackSessionProgress?: (stepCount: number, totalSteps: number) => SessionProgressEvent;
  }
}

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'test') {
  window.__resetSessionProgress = () => resetSessionProgressEvents();
  window.__getSessionProgress = () => getSessionProgressEvents();
  window.__trackSessionProgress = (stepCount: number, totalSteps: number) =>
    trackSessionProgress(stepCount, totalSteps);
}
