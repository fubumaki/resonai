// Minimal dev-friendly analytics sink with an in-memory ring buffer.
// DO NOT rely on this for production. Replace with your real sink when ready.

import { createHash, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

// --- add at top-level (module scope) ---
type RateState = { count: number; resetAt: number };
const RL: Map<string, RateState> = (globalThis as { __EVENT_RL__?: Map<string, RateState> }).__EVENT_RL__ ??= new Map();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const CSRF_HEADER = 'x-resonai-csrf';
const CSRF_COOKIE = 'resonai_csrf';

function clientKey(req: Request) {
  // best-effort; in many hosts x-forwarded-for is set, otherwise UA-based
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  const ua = req.headers.get('user-agent') || '';
  return `${ip}|${ua}`;
}

function checkRate(req: Request, limit = 120, windowMs = 60_000) {
  const k = clientKey(req);
  const now = Date.now();
  const s = RL.get(k) ?? { count: 0, resetAt: now + windowMs };
  if (now > s.resetAt) { s.count = 0; s.resetAt = now + windowMs; }
  s.count += 1;
  RL.set(k, s);
  return s.count <= limit;
}

function safeJsonLen(obj: unknown) {
  try { return JSON.stringify(obj).length; } catch { return Infinity; }
}
// --- end top-level helpers ---

function isCrossSite(request: Request) {
  const site = request.headers.get('sec-fetch-site');
  return site === 'cross-site';
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const url = new URL(request.url);
  return origin === url.origin;
}

function getCookieValue(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';').map(part => part.trim());
  for (const entry of cookies) {
    if (!entry) continue;
    const [k, ...rest] = entry.split('=');
    if (k === name) {
      return rest.join('=');
    }
  }
  return undefined;
}

function hasValidCsrf(request: Request) {
  try {
    const header = request.headers.get(CSRF_HEADER);
    if (!header) return false;
    const cookieValue = getCookieValue(request.headers.get('cookie'), CSRF_COOKIE);
    if (!cookieValue) return false;
    const headerBuf = Buffer.from(header, 'utf8');
    const cookieBuf = Buffer.from(cookieValue, 'utf8');
    if (headerBuf.length !== cookieBuf.length) return false;
    return timingSafeEqual(headerBuf, cookieBuf);
  } catch {
    return false;
  }
}

function hashSessionId(sessionId?: string) {
  if (!sessionId) return undefined;
  try {
    return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
  } catch {
    return undefined;
  }
}

type EventItem = {
  event: string;
  props?: Record<string, unknown>;
  ts?: number;
  session_id?: string;
  variant?: Record<string, string>;
};

type StoredEvent = Omit<EventItem, 'session_id'> & { session_hash?: string };

type Store = {
  buf: StoredEvent[];
  max: number;
};

const store: Store = (globalThis as { __EVENT_STORE__?: Store }).__EVENT_STORE__ ??= {
  buf: [],
  max: 1000, // ring buffer size
};

function sanitizeEventForStore(it: EventItem): StoredEvent {
  const { session_id, ...rest } = it;
  const session_hash = hashSessionId(session_id);
  return session_hash ? { ...rest, session_hash } : { ...rest };
}

function push(e: EventItem | EventItem[]) {
  const items = Array.isArray(e) ? e : [e];
  for (const it of items) {
    const sanitized = sanitizeEventForStore({ ts: Date.now(), ...it });
    store.buf.push(sanitized);
    if (store.buf.length > store.max) store.buf.splice(0, store.buf.length - store.max);
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request) || isCrossSite(request) || !hasValidCsrf(request)) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    }

    if (!checkRate(request)) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!/application\/json/i.test(contentType)) {
      return new Response(JSON.stringify({ error: 'content-type must be application/json' }), { status: 415 });
    }

    // Guard against oversized bodies (pilot safety)
    const raw = await request.text();
    if (raw.length > 50_000) { // ~50KB cap
      return new Response(JSON.stringify({ error: 'payload_too_large' }), { status: 413 });
    }
    const body = JSON.parse(raw);

    // Accept either {event,...}, [{event,...}], or {events:[...]}
    const payload =
      Array.isArray(body) ? body :
      Array.isArray(body?.events) ? body.events :
      body?.event ? [body] : [];

    if (!payload.length) {
      return new Response(JSON.stringify({ error: 'no events provided' }), { status: 400 });
    }
    // Very light validation
    const valid = payload.filter((e: unknown): e is EventItem => 
      typeof e === 'object' && e !== null && 'event' in e && 
      typeof (e as EventItem).event === 'string' && (e as EventItem).event.length > 0
    );
    if (!valid.length) {
      return new Response(JSON.stringify({ error: 'invalid events' }), { status: 400 });
    }
    
    // Schema stamp + timestamp + small props guard
    const SCHEMA_VERSION = 'v1';
    for (const e of valid) {
      if (!e.ts) e.ts = Date.now();
      (e as EventItem & { schema: string }).schema = SCHEMA_VERSION;

      // If props accidentally huge, clamp
      if (e.props && safeJsonLen(e.props) > 10_000) e.props = { _clamped: true };
    }
    
    console.log(`[events] +${valid.length} (schema=${SCHEMA_VERSION})`);
    push(valid);
    return new Response(JSON.stringify({ ok: true, count: valid.length }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}

export async function GET(request: Request) {
  if (IS_PRODUCTION) {
    return new Response('Not found', { status: 404 });
  }
  if (!isSameOrigin(request) || isCrossSite(request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
  // Debug/dev readback: /api/events?limit=50
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') ?? '50')));
  const out = store.buf.slice(-limit);
  return new Response(JSON.stringify({ events: out, total: store.buf.length }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function DELETE(request: Request) {
  if (IS_PRODUCTION) {
    return new Response('Not found', { status: 404 });
  }
  if (!isSameOrigin(request) || isCrossSite(request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
  const store: Store = (globalThis as { __EVENT_STORE__?: Store }).__EVENT_STORE__ ??= { buf: [], max: 1000 };
  store.buf.length = 0;
  return new Response(JSON.stringify({ ok: true, cleared: true, total: 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
