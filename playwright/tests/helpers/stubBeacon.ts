import { Page } from '@playwright/test';

export interface BeaconStubController {
  getPayloads(): Promise<any[]>;
  reset(): Promise<void>;
}

/**
 * Stubs navigator.sendBeacon so tests can introspect analytics traffic without
 * violating CSP. Payloads are captured on window.__BEACON_STUB__.
 */
export async function useStubbedBeacon(page: Page): Promise<BeaconStubController> {
  await page.addInitScript(() => {
    const nav = navigator as any;
    const store: any[] = [];
    const stub = {
      payloads: store,
      record(url: string, data?: BodyInit | null) {
        const entry: Record<string, unknown> = { url };
        if (data instanceof Blob) {
          entry.type = 'blob';
        } else if (typeof data === 'string') {
          entry.body = data;
        } else if (data && typeof data === 'object') {
          try {
            entry.body = JSON.stringify(data);
          } catch {
            entry.body = data;
          }
        }
        store.push(entry);
      },
      reset() {
        store.length = 0;
      },
    };

    (window as any).__BEACON_STUB__ = stub;

    nav.sendBeacon = (url: string, data?: BodyInit | null) => {
      stub.record(url, data ?? null);
      return true;
    };
  });

  return {
    async getPayloads() {
      return page.evaluate(() => {
        const stub = (window as any).__BEACON_STUB__;
        if (!stub) {
          return [];
        }
        return stub.payloads.map((entry: any) => {
          try {
            return JSON.parse(JSON.stringify(entry));
          } catch {
            return entry;
          }
        });
      });
    },
    async reset() {
      await page.evaluate(() => {
        const stub = (window as any).__BEACON_STUB__;
        if (stub) {
          stub.reset();
        }
      });
    },
  };
}
