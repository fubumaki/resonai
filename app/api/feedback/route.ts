import { NextRequest, NextResponse } from 'next/server';

type RateState = { count: number; resetAt: number };
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 submissions per window per client
const RATE_MAP: Map<string, RateState> = (globalThis as { __FEEDBACK_RL__?: Map<string, RateState> }).__FEEDBACK_RL__ ??=
  new Map();

const MAX_BODY_SIZE = 10_000; // ~10 KB payload cap

type FeedbackData = {
  feature: 'calibration' | 'hud' | 'general';
  rating: number;
  comments?: string;
  userAgent?: string;
  timestamp?: number;
  sessionId?: string;
};

function clientKey(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  const ua = req.headers.get('user-agent') || '';
  return `${ip}|${ua}`;
}

function enforceRateLimit(req: NextRequest) {
  const key = clientKey(req);
  const now = Date.now();
  const existing = RATE_MAP.get(key) ?? { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > existing.resetAt) {
    existing.count = 0;
    existing.resetAt = now + RATE_LIMIT_WINDOW;
  }
  existing.count += 1;
  RATE_MAP.set(key, existing);
  return existing.count <= RATE_LIMIT_MAX;
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  // Non-browser requests (no Origin) must still be same-origin; reject explicit cross-site attempts.
  if (!origin) return true;
  return origin === req.nextUrl.origin;
}

function isCrossSite(req: NextRequest) {
  const site = req.headers.get('sec-fetch-site');
  return site === 'cross-site';
}

function validateFeedback(data: unknown): data is Required<Pick<FeedbackData, 'feature' | 'rating'>> & FeedbackData {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as FeedbackData;
  const validFeature = candidate.feature === 'calibration' || candidate.feature === 'hud' || candidate.feature === 'general';
  const validRating = typeof candidate.rating === 'number' && Number.isFinite(candidate.rating) && candidate.rating >= 1 && candidate.rating <= 5;
  const validComments = candidate.comments === undefined || typeof candidate.comments === 'string';
  const validTimestamp = candidate.timestamp === undefined || (typeof candidate.timestamp === 'number' && Number.isFinite(candidate.timestamp));
  const validSession = candidate.sessionId === undefined || typeof candidate.sessionId === 'string';
  return validFeature && validRating && validComments && validTimestamp && validSession;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request) || isCrossSite(request)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (!enforceRateLimit(request)) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!/application\/json/i.test(contentType)) {
      return NextResponse.json({ error: 'content_type_required' }, { status: 415 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
    }

    let parsed: unknown;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    if (!validateFeedback(parsed)) {
      return NextResponse.json({ error: 'invalid_feedback' }, { status: 400 });
    }

    // Future enhancement: persist to durable storage. For now we simply acknowledge receipt
    // without logging potentially sensitive metadata to stdout.
    return NextResponse.json({ message: 'Feedback received successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json({ error: 'Failed to process feedback' }, { status: 500 });
  }
}
