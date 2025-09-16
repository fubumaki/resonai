import { analytics, type AnalyticsEvent } from '@/lib/analytics';
import { calculateTrainingSessionProgress } from '@/lib/progress';

export const SESSION_PROGRESS_RESET_EVENT = 'resonai:session-progress-reset';

export interface SessionProgressResetDetail {
  reason?: string;
  announcementPrefix?: string;
  totalSteps?: number;
}

export type SessionProgressResetEvent = CustomEvent<SessionProgressResetDetail>;

const DEFAULT_TOTAL_STEPS = 10;

function sanitizeTotalSteps(totalSteps: number | undefined, fallback: number): number {
  const total = Number(totalSteps ?? fallback);
  if (!Number.isFinite(total) || total <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(total));
}

function clampCompletedSteps(completed: number, totalSteps: number): number {
  const value = Number(completed);
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value);
  return Math.min(Math.max(rounded, 0), totalSteps);
}

function ensureSentence(text?: string): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}

function buildProgressMessage(completed: number, totalSteps: number): string {
  return `Practice session progress: ${completed} of ${totalSteps} trials completed`;
}

function buildPrefixedProgressMessage(prefix: string | undefined, completed: number, totalSteps: number): string {
  const base = buildProgressMessage(completed, totalSteps);
  const normalizedPrefix = ensureSentence(prefix);
  return normalizedPrefix ? `${normalizedPrefix} ${base}` : base;
}

function buildResetMessage(totalSteps: number, prefix?: string): string {
  return buildPrefixedProgressMessage(prefix ?? 'Practice session progress reset.', 0, totalSteps);
}

export interface SessionProgressAnnouncementState {
  completed: number;
  totalSteps: number;
  message: string;
}

export type SessionProgressAnnouncementAction =
  | { type: 'progress'; completed: number; totalSteps?: number; announcementPrefix?: string }
  | { type: 'reset'; totalSteps?: number; announcementPrefix?: string };

export function createSessionProgressState(
  totalSteps: number = DEFAULT_TOTAL_STEPS,
  completed: number = 0
): SessionProgressAnnouncementState {
  const safeTotal = sanitizeTotalSteps(totalSteps, DEFAULT_TOTAL_STEPS);
  const safeCompleted = clampCompletedSteps(completed, safeTotal);
  return {
    completed: safeCompleted,
    totalSteps: safeTotal,
    message: buildProgressMessage(safeCompleted, safeTotal),
  };
}

export function sessionProgressAnnouncementReducer(
  state: SessionProgressAnnouncementState,
  action: SessionProgressAnnouncementAction
): SessionProgressAnnouncementState {
  switch (action.type) {
    case 'progress': {
      const totalSteps = sanitizeTotalSteps(action.totalSteps, state.totalSteps);
      const completed = clampCompletedSteps(action.completed, totalSteps);
      return {
        completed,
        totalSteps,
        message: buildPrefixedProgressMessage(action.announcementPrefix, completed, totalSteps),
      };
    }
    case 'reset': {
      const totalSteps = sanitizeTotalSteps(action.totalSteps, state.totalSteps);
      return {
        completed: 0,
        totalSteps,
        message: buildResetMessage(totalSteps, action.announcementPrefix),
      };
    }
    default:
      return state;
  }
}

export function createSessionProgressResetEvent(
  detail: SessionProgressResetDetail = {}
): SessionProgressResetEvent {
  return new CustomEvent<SessionProgressResetDetail>(SESSION_PROGRESS_RESET_EVENT, { detail });
}

export function dispatchSessionProgressReset(
  detail: SessionProgressResetDetail = {}
): SessionProgressResetEvent | null {
  if (typeof window === 'undefined') return null;
  const event = createSessionProgressResetEvent(detail);
  window.dispatchEvent(event);
  return event;
}

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
    __resetSessionProgressImpl?: () => void;
    __getSessionProgressImpl?: () => SessionProgressEvent[];
    __trackSessionProgressImpl?: (stepCount: number, totalSteps: number) => SessionProgressEvent;
  }
}

// Expose lightweight test helpers in the browser so E2E can drive analytics deterministically
// These are no-ops on the server and only attach when a window object exists.
if (typeof window !== 'undefined') {
  // Attach implementations to window for the beforeInteractive script to use
  window.__resetSessionProgressImpl = () => resetSessionProgressEvents();
  window.__getSessionProgressImpl = () => getSessionProgressEvents();
  window.__trackSessionProgressImpl = (stepCount: number, totalSteps: number) =>
    trackSessionProgress(stepCount, totalSteps);

  // Also attach directly for backward compatibility
  window.__resetSessionProgress = () => resetSessionProgressEvents();
  window.__getSessionProgress = () => getSessionProgressEvents();
  window.__trackSessionProgress = (stepCount: number, totalSteps: number) =>
    trackSessionProgress(stepCount, totalSteps);
}
