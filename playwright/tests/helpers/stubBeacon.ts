import { Page } from '@playwright/test';

export async function useStubBeacon(page: Page) {
  await page.addInitScript(() => {
    // Store original sendBeacon for potential restoration
    (navigator as any).__origSendBeacon__ = navigator.sendBeacon?.bind(navigator);

    // Replace sendBeacon with fetch-based implementation for test reliability
    (navigator as any).sendBeacon = (url: string, data?: any) => {
      const headers: Record<string, string> = {};
      let body: any = data;

      if (data instanceof Blob) {
        // Playwright serializes Blobs poorly; read it to text before sending
        return (data as Blob).text().then(t => {
          headers['content-type'] = 'application/json';
          return fetch(url, { method: 'POST', headers, body: t }).then(() => true, () => true);
        });
      }
      if (typeof data === 'string') {
        // assume pre-serialized JSON
        headers['content-type'] = 'application/json';
      }
      return fetch(url, { method: 'POST', headers, body }).then(() => true, () => true);
    };
  });
}

