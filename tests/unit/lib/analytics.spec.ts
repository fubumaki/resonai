import { Blob as NodeBlob } from 'buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('analytics beacon payload', () => {
  let originalSendBeacon: Navigator['sendBeacon'] | undefined;
  let originalBlob: typeof globalThis.Blob;

  beforeEach(() => {
    originalSendBeacon = navigator.sendBeacon;
    originalBlob = globalThis.Blob;
    vi.resetModules();
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { Blob: typeof globalThis.Blob }).Blob = NodeBlob as unknown as typeof Blob;
  });

  afterEach(async () => {
    if (originalSendBeacon) {
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        writable: true,
        value: originalSendBeacon,
      });
    } else {
      delete (navigator as Partial<Navigator> & { sendBeacon?: unknown }).sendBeacon;
    }

    (globalThis as typeof globalThis & { Blob: typeof globalThis.Blob }).Blob = originalBlob;

    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();

    const routeModule = await import('@/app/api/events/route');
    if (routeModule.DELETE) {
      await routeModule.DELETE();
    }
  });

  it('flushes beacon payload with JSON content-type accepted by /api/events', async () => {
    const sendBeaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeaconSpy,
    });

    const analyticsModule = await import('@/lib/analytics');
    const analytics = analyticsModule.analytics;
    analytics.track('beacon_test', { scope: 'unit' });

    await (analytics as unknown as { flush: () => Promise<void> }).flush();

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);

    const [url, data] = sendBeaconSpy.mock.calls[0] as [string, Blob];
    expect(url).toBe('/api/events');
    expect(data).toBeInstanceOf(Blob);
    expect(data.type).toBe('application/json');

    const raw = await new Response(data).text();
    const parsed = JSON.parse(raw) as { events: unknown[] };
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events).not.toHaveLength(0);

    // Node's Request implementation doesn't infer the blob's content-type, so
    // explicitly forward it to mirror how browsers send the beacon payload.
    const request = new Request('http://localhost/api/events', {
      method: 'POST',
      body: raw,
      headers: { 'content-type': data.type },
    });

    const routeModule = await import('@/app/api/events/route');
    const response = await routeModule.POST(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, count: 1 });
  });
});
