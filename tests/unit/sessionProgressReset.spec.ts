import { describe, it, expect, vi } from 'vitest';
import {
  SESSION_PROGRESS_RESET_EVENT,
  createSessionProgressResetEvent,
  createSessionProgressState,
  dispatchSessionProgressReset,
  sessionProgressAnnouncementReducer,
  type SessionProgressResetDetail,
} from '@/src/sessionProgress';

describe('sessionProgressAnnouncementReducer', () => {
  it('updates message when progress is recorded', () => {
    const initial = createSessionProgressState(10, 3);
    const next = sessionProgressAnnouncementReducer(initial, {
      type: 'progress',
      completed: 5,
      totalSteps: 10,
    });

    expect(next.completed).toBe(5);
    expect(next.totalSteps).toBe(10);
    expect(next.message).toBe('Practice session progress: 5 of 10 trials completed');
  });

  it('resets message with announcement prefix', () => {
    const initial = createSessionProgressState(10, 4);
    const next = sessionProgressAnnouncementReducer(initial, {
      type: 'reset',
      announcementPrefix: 'Trials cleared.',
    });

    expect(next.completed).toBe(0);
    expect(next.totalSteps).toBe(10);
    expect(next.message).toBe('Trials cleared. Practice session progress: 0 of 10 trials completed');
  });
});

describe('session progress reset events', () => {
  it('creates a reset event with detail payload', () => {
    const detail: SessionProgressResetDetail = {
      reason: 'unit-test',
      announcementPrefix: 'Practice data reset.',
    };

    const event = createSessionProgressResetEvent(detail);

    expect(event.type).toBe(SESSION_PROGRESS_RESET_EVENT);
    expect(event.detail).toEqual(detail);
  });

  it('dispatches reset events to window listeners', () => {
    const listener = vi.fn();
    const handler: EventListener = event => listener(event);
    window.addEventListener(SESSION_PROGRESS_RESET_EVENT, handler);

    const detail: SessionProgressResetDetail = {
      reason: 'dispatch-test',
      announcementPrefix: 'Trials cleared.',
    };

    const event = dispatchSessionProgressReset(detail);

    expect(event).toBeInstanceOf(CustomEvent);
    expect(listener).toHaveBeenCalledTimes(1);
    const received = listener.mock.calls[0][0] as CustomEvent<SessionProgressResetDetail>;
    expect(received.detail).toEqual(detail);

    window.removeEventListener(SESSION_PROGRESS_RESET_EVENT, handler);
  });
});
