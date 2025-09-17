// Core analytics functionality
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

// Simple analytics tracking function
export function trackEvent(event: string, properties?: Record<string, any>) {
  try {
    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, properties);
    }

    // Send to custom analytics endpoint if available
    if (typeof window !== 'undefined') {
      try {
        const endpoint = window.location?.origin
          ? new URL('/api/analytics', window.location.origin).toString()
          : '/api/analytics';

        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event,
            properties,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          }),
        }).catch(error => {
          console.warn('Analytics tracking failed:', error);
        });
      } catch (urlError) {
        console.warn('Analytics tracking failed:', urlError);
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event, properties);
    }
  } catch (error) {
    console.warn('Analytics tracking error:', error);
  }
}

// Legacy function for backward compatibility
export const track = trackEvent;
