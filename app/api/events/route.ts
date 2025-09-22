// Minimal dev-friendly analytics sink with an in-memory ring buffer.
// DO NOT rely on this for production. Replace with your real sink when ready.
// Also forwards sanitized analytics to OTel Collector → SigNoz for observability.

// --- add at top-level (module scope) ---
import { sendOtelLogs, createAnalyticsLogRecord } from '../../../lib/otel/logs';

type RateState = { count: number; resetAt: number };
const RL: Map<string, RateState> = (globalThis as { __EVENT_RL__?: Map<string, RateState> }).__EVENT_RL__ ??= new Map();

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

type EventItem = {
  event: string;
  props?: Record<string, unknown>;
  ts?: number;
  session_id?: string;
  variant?: Record<string, string>;
};

type Store = {
  buf: EventItem[];
  max: number;
};

const store: Store = (globalThis as { __EVENT_STORE__?: Store }).__EVENT_STORE__ ??= {
  buf: [],
  max: 1000, // ring buffer size
};

function push(e: EventItem | EventItem[]) {
  const items = Array.isArray(e) ? e : [e];
  for (const it of items) {
    store.buf.push({ ts: Date.now(), ...it });
    if (store.buf.length > store.max) store.buf.splice(0, store.buf.length - store.max);
  }
}

export async function POST(request: Request) {
  try {
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
    
    // Tee analytics to OTel Collector → SigNoz (best-effort, non-blocking)
    try {
      const otelRecords = valid.map(createAnalyticsLogRecord);
      // Send in small batches to avoid overwhelming the collector
      const batchSize = 50;
      for (let i = 0; i < otelRecords.length; i += batchSize) {
        const batch = otelRecords.slice(i, i + batchSize);
        sendOtelLogs(batch).catch(err => 
          console.warn('[events] OTel forwarding failed:', err.message)
        );
      }
    } catch (err) {
      console.warn('[events] OTel record creation failed:', err instanceof Error ? err.message : String(err));
    }
    
    return new Response(JSON.stringify({ ok: true, count: valid.length }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
}

export async function GET(request: Request) {
  // Debug/dev readback: /api/events?limit=50
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') ?? '50')));
  const out = store.buf.slice(-limit);
  return new Response(JSON.stringify({ events: out, total: store.buf.length }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function DELETE() {
  const store: Store = (globalThis as { __EVENT_STORE__?: Store }).__EVENT_STORE__ ??= { buf: [], max: 1000 };
  store.buf.length = 0;
  return new Response(JSON.stringify({ ok: true, cleared: true, total: 0 }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
