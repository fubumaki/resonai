import { Page } from '@playwright/test';
import { stubBeacon } from './stubBeacon';

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
  await stubBeacon(page, { intercept: interceptBeacon });
  await page.addInitScript(({ intercept }) => {
    const globalAny = window as any;

    if (globalAny.__ANALYTICS_STUB__) {
      globalAny.__ANALYTICS_STUB__.options.interceptBeacon = intercept;
      const beaconStub = globalAny.__BEACON_STUB__;
      if (beaconStub) {
        beaconStub.options.intercept = intercept;
      }
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
      beacons.push(clone(entry));
    };

    const stub = {
      events,
      beacons,
      options: {
        interceptBeacon: intercept,
      },
      detachBeacon: undefined as undefined | (() => void),
      record(event: any) {
        if (!event) return;
        events.push(clone(event));
      },
      recordBeacon,
      reset() {
        events.length = 0;
        beacons.length = 0;
        try {
          globalAny.__BEACON_STUB__?.reset?.();
        } catch (error) {
          console.warn('analytics beacon reset failed', error);
        }
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

    const attachBeaconListener = () => {
      const beaconStub = globalAny.__BEACON_STUB__;
      if (!beaconStub) {
        return;
      }

      if (typeof stub.detachBeacon === 'function') {
        try {
          stub.detachBeacon();
        } catch (error) {
          console.warn('analytics beacon detach failed', error);
        }
        stub.detachBeacon = undefined;
      }

      beaconStub.options = beaconStub.options || {};
      beaconStub.options.intercept = intercept;

      const listener = (entry: any) => {
        try {
          stub.recordBeacon(entry);
        } catch (error) {
          console.warn('analytics beacon listener failed', error);
        }
      };

      try {
        const snapshot = beaconStub.snapshot?.();
        if (Array.isArray(snapshot)) {
          snapshot.forEach((entry: any) => {
            try {
              stub.recordBeacon(entry);
            } catch (error) {
              console.warn('analytics beacon snapshot push failed', error);
            }
          });
        }
      } catch (error) {
        console.warn('analytics beacon snapshot failed', error);
      }

      beaconStub.addListener?.(listener);
      stub.detachBeacon = () => {
        beaconStub.removeListener?.(listener);
      };
    };

    attachBeaconListener();

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
  };
}

