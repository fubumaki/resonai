import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CSRF_HEADER = 'x-resonai-csrf';
const CSRF_COOKIE = 'resonai_csrf';

function buildHeaders(token: string) {
  return {
    origin: 'http://localhost',
    'sec-fetch-site': 'same-origin',
    cookie: `${CSRF_COOKIE}=${token}`,
    [CSRF_HEADER]: token,
  } as Record<string, string>;
}

describe('analytics beacon payload', () => {
  let originalFetch: typeof fetch;
  let fetchSpy: ReturnType<typeof vi.fn<[RequestInfo | URL, RequestInit?], Promise<Response>>>;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchSpy = vi.fn<[RequestInfo | URL, RequestInit?], Promise<Response>>(async () => new Response(JSON.stringify({ ok: true })));
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = fetchSpy as unknown as typeof fetch;
    document.cookie = `${CSRF_COOKIE}=testtoken`;
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    (globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = originalFetch;
    document.cookie = `${CSRF_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();

    const routeModule = await import('@/app/api/events/route');
    if (routeModule.DELETE) {
      const cleanupRequest = new Request('http://localhost/api/events', {
        method: 'DELETE',
        headers: buildHeaders('testtoken'),
      });
      await routeModule.DELETE(cleanupRequest);
    }
  });

  it('flushes analytics payload with CSRF protection accepted by /api/events', async () => {
    const analyticsModule = await import('@/lib/analytics');
    const analytics = analyticsModule.analytics;
    analytics.track('beacon_test', { scope: 'unit' });

    await (analytics as unknown as { flush: () => Promise<void> }).flush();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/events');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.headers).toMatchObject({
      'Content-Type': 'application/json',
      [CSRF_HEADER]: 'testtoken',
    });

    const body = init?.body as string;
    const parsed = JSON.parse(body) as { events: unknown[] };
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events).not.toHaveLength(0);

    const routeModule = await import('@/app/api/events/route');
    const response = await routeModule.POST(new Request('http://localhost/api/events', {
      method: 'POST',
      body,
      headers: {
        'content-type': 'application/json',
        ...buildHeaders('testtoken'),
      },
    }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, count: 1 });
  });
});
