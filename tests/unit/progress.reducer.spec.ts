import { describe, expect, it } from 'vitest';
import {
  createSessionProgressState,
  sessionProgressAnnouncementReducer,
} from '@/src/sessionProgress';

describe('practice progress reducer', () => {
  it('resets progress to zero with reset action', () => {
    const initial = createSessionProgressState(10, 6);
    const next = sessionProgressAnnouncementReducer(initial, {
      type: 'reset',
      totalSteps: 8,
      announcementPrefix: 'Reset triggered',
    });

    expect(next.completed).toBe(0);
    expect(next.totalSteps).toBe(8);
    expect(next.message).toContain('Reset triggered');
  });

  it('updates progress with bounded steps', () => {
    const initial = createSessionProgressState(10, 0);
    const next = sessionProgressAnnouncementReducer(initial, {
      type: 'progress',
      completed: 12,
      totalSteps: 10,
    });

    expect(next.completed).toBe(10);
    expect(next.message).toContain('10 of 10');
  });
});
