/**
 * Analytics client for Instant Practice M0
 * Buffers events in memory and flushes via sendBeacon
 */

export interface AnalyticsEvent {
  event: string;
  props: Record<string, unknown>;
  ts: number;
  session_id: string;
  user_id?: string;
  variant?: string;
}

class AnalyticsClient {
  private buffer: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushInterval: number = 10000; // 10 seconds
  private maxBufferSize: number = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startFlushInterval();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushInterval(): void {
    if (typeof window === 'undefined') return;
    
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  track(event: string, props: Record<string, unknown> = {}): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      props,
      ts: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId,
    };

    this.buffer.push(analyticsEvent);

    // Flush if buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // Dispatch custom event for debugging
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('analytics:track', { 
        detail: analyticsEvent 
      }));
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setVariant(variant: string): void {
    // Update all buffered events with variant
    this.buffer.forEach(event => {
      event.variant = variant;
    });
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      // Use sendBeacon for reliable delivery
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          '/api/events',
          JSON.stringify({ events })
        );
        
        if (!success) {
          // Fallback to fetch if sendBeacon fails
          await this.fallbackFlush(events);
        }
      } else {
        // Fallback for browsers without sendBeacon
        await this.fallbackFlush(events);
      }
    } catch (error) {
      console.warn('Analytics flush failed:', error);
      // Re-add events to buffer for retry
      this.buffer.unshift(...events);
    }
  }

  private async fallbackFlush(events: AnalyticsEvent[]): Promise<void> {
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });
  }

  // Flush on page unload
  flushOnUnload(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsClient();

// Initialize on client side
if (typeof window !== 'undefined') {
  analytics.flushOnUnload();
}

// Core event tracking functions
export function trackScreenView(name: string): void {
  analytics.track('screen_view', { name });
}

export function trackCtaClick(id: string, surface: string): void {
  analytics.track('cta_click', { id, surface });
}

export function trackPermissionRequested(type: string, surface: string): void {
  analytics.track('permission_requested', { type, surface });
}

export function trackPermissionGranted(surface: string): void {
  analytics.track('permission_granted', { surface });
}

export function trackPermissionDenied(surface: string): void {
  analytics.track('permission_denied', { surface });
}

export function trackMicSessionStart(): void {
  analytics.track('mic_session_start', {});
}

export function trackMicSessionEnd(durationMs?: number): void {
  analytics.track('mic_session_end', { duration_ms: durationMs });
}

export function trackPracticeFeedback(target: string, status: 'hit' | 'near' | 'miss'): void {
  analytics.track('practice_feedback', { target, status });
}

export function trackOnboardingStepView(step: number, totalSteps: number): void {
  analytics.track('onboarding_step_view', { step, total_steps: totalSteps });
}

export function trackSignUpShown(placement: 'pre' | 'post_practice'): void {
  analytics.track('sign_up_shown', { placement });
}

export function trackSignUpCompleted(placement: 'pre' | 'post_practice'): void {
  analytics.track('sign_up_completed', { placement });
}

export function trackTtvMeasured(ms: number): void {
  analytics.track('ttv_measured', { ms });
}

export function trackActivation(cohortKey: string): void {
  analytics.track('activation', { cohort_key: cohortKey, activated: true });
}
