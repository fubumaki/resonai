import { Page } from '@playwright/test';

export interface AnalyticsStub {
  /**
   * Returns the analytics events captured via analytics:track CustomEvents or
   * queued beacon payloads. The data is cloned so tests can mutate it safely.
   */
  getEvents(): Promise<any[]>;
  /**
   * Returns payloads passed to navigator.sendBeacon/fetch for /api/events.
   */
  getBeaconPayloads(): Promise<any[]>;
  /**
   * Clears captured events and beacon payloads.
   */
  reset(): Promise<void>;
  /**
   * Forces immediate flush of buffered analytics events.
   */
  forceFlush(): Promise<void>;
}

export interface StubbedAnalyticsOptions {
  /**
   * When true (default), navigator.sendBeacon is short-circuited to avoid
   * network access while still recording payloads.
   */
  interceptBeacon?: boolean;
}

/**
 * Installs an analytics stub that records CustomEvent analytics traffic and
 * beacon payloads without hitting the real network. Tests can await the
 * returned controller to inspect or reset captured data.
 */
export async function useStubbedAnalytics(
  page: Page,
  { interceptBeacon = true }: StubbedAnalyticsOptions = {}
): Promise<AnalyticsStub> {
  await page.addInitScript(({ intercept }) => {
    const globalAny = window as any;

    if (globalAny.__ANALYTICS_STUB__) {
      globalAny.__ANALYTICS_STUB__.options.interceptBeacon = intercept;
      return;
    }

    const events: any[] = [];
    const beacons: any[] = [];

    const clone = (value: any) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to clone analytics payload', error);
        return value;
      }
    };

    const recordBeacon = (entry: any) => {
      beacons.push(entry);
    };

    const stub = {
      events,
      beacons,
      options: {
        interceptBeacon: intercept,
      },
      record(event: any) {
        if (!event) return;
        events.push(clone(event));
      },
      recordBeacon,
      reset() {
        events.length = 0;
        beacons.length = 0;
      },
      snapshot() {
        return {
          events: events.map(clone),
          beacons: beacons.map(clone),
        };
      },
    };

    globalAny.__ANALYTICS_STUB__ = stub;

    window.addEventListener('analytics:track', (event: Event) => {
      const detail = (event as CustomEvent).detail;
      stub.record(detail);
    });

    const navAny = navigator as any;
    const originalSendBeacon = navAny.sendBeacon?.bind(navigator);

    navAny.sendBeacon = (url: string, data?: BodyInit | null) => {
      const entry: Record<string, any> = { url };
      stub.recordBeacon(entry);

      let forwarded = false;
      const forwardWhenReady = () => {
        if (forwarded) {
          return true;
        }
        forwarded = true;

        if (stub.options.interceptBeacon) {
          return true;
        }

        if (originalSendBeacon) {
          return originalSendBeacon(url, data);
        }

        if (typeof window.fetch === 'function') {
          const payload =
            typeof entry.body === 'string'
              ? entry.body
              : entry.json
              ? JSON.stringify(entry.json)
              : undefined;

          if (payload !== undefined) {
            window
              .fetch(url, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: payload,
              })
              .catch(() => undefined);
          }
        }

        return true;
      };

      const assign = (text: string) => {
        entry.body = text;
        try {
          entry.json = JSON.parse(text);
        } catch (error) {
          entry.text = text;
        }
      };

      if (typeof data === 'string') {
        assign(data);
        return forwardWhenReady();
      }

      if (data instanceof Blob) {
        data.text().then(text => {
          assign(text);
          forwardWhenReady();
        });

        if (!stub.options.interceptBeacon && originalSendBeacon) {
          forwarded = true;
          return originalSendBeacon(url, data);
        }

        return true;
      }

      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buffer = data instanceof ArrayBuffer ? data : data.buffer;
        try {
          const decoder = new TextDecoder();
          assign(decoder.decode(buffer));
        } catch {
          entry.body = buffer;
        }
        return forwardWhenReady();
      }

      if (data instanceof FormData) {
        const snapshot: Record<string, any> = {};
        data.forEach((value, key) => {
          snapshot[key] = typeof value === 'string' ? value : '[object Blob]';
        });
        entry.json = snapshot;
        entry.body = JSON.stringify(snapshot);
        return forwardWhenReady();
      }

      if (data != null) {
        try {
          if (typeof data === 'string') {
            assign(data);
          } else {
            assign(JSON.stringify(data));
          }
        } catch {
          entry.body = data;
        }
        return forwardWhenReady();
      }

      return forwardWhenReady();
    };

    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch.bind(window);

      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await originalFetch(input as any, init);
        try {
          const url = typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.toString()
            : (input as Request).url;

          if (url && url.includes('/api/events') && init?.body && typeof init.body === 'string') {
            stub.recordBeacon({
              url,
              body: init.body,
              json: (() => {
                try {
                  return JSON.parse(init.body as string);
                } catch {
                  return undefined;
                }
              })(),
            });
          }
        } catch (error) {
          console.warn('analytics stub fetch interception failed', error);
        }

        return response;
      };
    }
  }, { intercept: interceptBeacon });

  const exec = async <T>(task: 'snapshot' | 'reset'): Promise<T> => {
    return page.evaluate(({ task }) => {
      const stub = (window as any).__ANALYTICS_STUB__;
      if (!stub) {
        return task === 'snapshot' ? { events: [], beacons: [] } : undefined;
      }

      if (task === 'reset') {
        stub.reset();
        return undefined;
      }

      return stub.snapshot();
    }, { task }) as T;
  };

  return {
    async getEvents() {
      const snapshot = await exec<{ events: any[]; beacons: any[] }>('snapshot');
      return snapshot.events;
    },
    async getBeaconPayloads() {
      const snapshot = await exec<{ events: any[]; beacons: any[] }>('snapshot');
      return snapshot.beacons;
    },
    async reset() {
      await exec('reset');
    },
    async forceFlush() {
      await page.evaluate(() => {
        const analytics = (window as any).__analytics;
        if (analytics && analytics.forceFlush) {
          return analytics.forceFlush();
        }
      });
    },
  };
}

