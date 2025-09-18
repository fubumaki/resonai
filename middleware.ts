import { NextResponse, NextRequest } from 'next/server';
import { bucketPct } from './lib/flagBucket';

const PILOT_COOKIE = 'pilot_cohort';     // 'pilot' | 'control'
const DEFAULT_ROLLOUT = 0.2;             // 20% if env missing
const CSRF_COOKIE = 'resonai_csrf';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const res = NextResponse.next();

  // No-store for dynamic pilot routes + analytics
  if (url.pathname.startsWith('/try') || url.pathname.startsWith('/api/events')) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  // Assign cohort once via cookie (sticky)
  const existing = req.cookies.get(PILOT_COOKIE)?.value;
  if (!existing) {
    const sid = req.cookies.get('sid')?.value
      || req.headers.get('x-forwarded-for')
      || req.headers.get('user-agent')
      || crypto.randomUUID();
    const pct = Number(process.env.PILOT_ROLLOUT_PCT ?? DEFAULT_ROLLOUT);
    const cohort = bucketPct(sid) < pct ? 'pilot' : 'control';
    res.cookies.set(PILOT_COOKIE, cohort, { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
  }

  const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
  if (!csrfCookie) {
    const token = crypto.randomUUID().replace(/-/g, '');
    res.cookies.set(CSRF_COOKIE, token, {
      path: '/',
      httpOnly: false,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}

export const config = {
  // Middlewares apply to /try, /api/events and root (headers)
  matcher: ['/try/:path*', '/api/events', '/'],
};
