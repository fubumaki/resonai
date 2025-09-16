import { Page } from '@playwright/test';

export interface BeaconPayload {
  url: string;
  body?: unknown;
  json?: unknown;
  text?: string;
}

export interface BeaconStubController {
  /**
   * Returns a clone of all beacon payloads captured since the last reset.
   */
  getCalls(): Promise<BeaconPayload[]>;
  /**
   * Clears captured payloads.
   */
  reset(): Promise<void>;
  /**
   * Updates whether navigator.sendBeacon should be intercepted (default true).
   */
  setIntercept(enabled: boolean): Promise<void>;
}

export interface StubBeaconOptions {
  /**
   * When true (default), navigator.sendBeacon short-circuits without touching
   * the network. When false, the original implementation (or fetch fallback)
   * is invoked after recording the payload.
   */
  intercept?: boolean;
}

function clone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

export async function stubBeacon(
  page: Page,
  { intercept = true }: StubBeaconOptions = {},
): Promise<BeaconStubController> {
  await page.addInitScript(({ intercept }) => {
    const globalAny = window as any;
    const existing = globalAny.__BEACON_STUB__;

    if (existing) {
      existing.options.intercept = intercept;
      return;
    }

    const calls: BeaconPayload[] = [];
    const listeners: Array<(entry: BeaconPayload) => void> = [];
    const navAny = navigator as any;
    const originalSendBeacon = navAny.sendBeacon?.bind(navigator);
    const cloneEntry = (value: BeaconPayload) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return value;
      }
    };

    const notify = (entry: BeaconPayload) => {
      for (const listener of listeners) {
        try {
          listener(entry);
        } catch (error) {
          console.warn('beacon listener threw', error);
        }
      }
    };

    const assignFromString = (entry: BeaconPayload, text: string) => {
      entry.body = text;
      try {
        entry.json = JSON.parse(text);
      } catch {
        entry.text = text;
      }
    };

    const forward = (url: string, data: BodyInit | null | undefined, entry: BeaconPayload) => {
      if (stub.options.intercept) {
        return true;
      }

      if (originalSendBeacon) {
        try {
          return originalSendBeacon(url, data);
        } catch (error) {
          console.warn('sendBeacon forward failed', error);
        }
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

    const stub = {
      options: { intercept },
      addListener(listener: (entry: BeaconPayload) => void) {
        if (typeof listener === 'function') {
          listeners.push(listener);
        }
      },
      removeListener(listener: (entry: BeaconPayload) => void) {
        const index = listeners.indexOf(listener);
        if (index >= 0) {
          listeners.splice(index, 1);
        }
      },
      record(entry: BeaconPayload) {
        calls.push(entry);
        notify(entry);
      },
      reset() {
        calls.length = 0;
      },
      snapshot() {
        return calls.map(cloneEntry);
      },
    };

    navAny.sendBeacon = (url: string, data?: BodyInit | null) => {
      const entry: BeaconPayload = { url };
      const finalize = (payload: BodyInit | null | undefined) => {
        stub.record(entry);
        return forward(url, payload, entry);
      };

      if (typeof data === 'string') {
        assignFromString(entry, data);
        return finalize(data);
      }

      if (data instanceof Blob) {
        data
          .text()
          .then((text) => {
            assignFromString(entry, text);
            finalize(data);
          })
          .catch(() => finalize(data));

        if (!stub.options.intercept && originalSendBeacon) {
          try {
            return originalSendBeacon(url, data);
          } catch (error) {
            console.warn('sendBeacon forward failed', error);
          }
        }

        return true;
      }

      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buffer = data instanceof ArrayBuffer ? data : data.buffer;
        try {
          const decoder = new TextDecoder();
          assignFromString(entry, decoder.decode(buffer));
        } catch {
          entry.body = buffer;
        }
        return finalize(data);
      }

      if (data instanceof FormData) {
        const snapshot: Record<string, unknown> = {};
        data.forEach((value, key) => {
          snapshot[key] = typeof value === 'string' ? value : '[object Blob]';
        });
        entry.json = snapshot;
        entry.body = JSON.stringify(snapshot);
        return finalize(data);
      }

      if (data != null) {
        try {
          if (typeof data === 'string') {
            assignFromString(entry, data);
          } else {
            assignFromString(entry, JSON.stringify(data));
          }
        } catch {
          entry.body = data as unknown;
        }
        return finalize(data);
      }

      return finalize(data);
    };

    globalAny.__BEACON_STUB__ = stub;
  }, { intercept });

  const exec = async <T, R = T>(task: 'snapshot' | 'reset' | 'setIntercept', arg?: R): Promise<T> => {
    return page.evaluate(({ task, arg }) => {
      const stub = (window as any).__BEACON_STUB__;
      if (!stub) {
        if (task === 'snapshot') {
          return [];
        }
        return undefined;
      }

      if (task === 'reset') {
        stub.reset?.();
        return undefined;
      }

      if (task === 'setIntercept') {
        stub.options.intercept = Boolean(arg);
        return undefined;
      }

      return stub.snapshot?.() ?? [];
    }, { task, arg }) as T;
  };

  return {
    async getCalls() {
      const snapshot = await exec<BeaconPayload[]>('snapshot');
      return snapshot.map(clone);
    },
    async reset() {
      await exec('reset');
    },
    async setIntercept(enabled: boolean) {
      await exec('setIntercept', enabled);
    },
  };
}
