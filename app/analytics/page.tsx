'use client';

import React, { useEffect, useMemo, useState } from 'react';

type EventItem = {
  event: string;
  props?: Record<string, unknown>;
  ts?: number;
  session_id?: string;
  session_hash?: string;
  variant?: Record<string, string>;
};

type FetchPayload = { events: EventItem[]; total: number };

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = Math.min(a.length - 1, Math.max(0, Math.floor((p / 100) * (a.length - 1))));
  return a[idx];
}

function prettyMs(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  const s = (ms / 1000).toFixed(2);
  return `${s}s`;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchLatest(signal?: AbortSignal) {
    try {
      const r = await fetch('/api/events?limit=200', { signal, cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j: FetchPayload = await r.json();
      setEvents(j.events ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetchLatest(ctrl.signal);
    const id = setInterval(() => fetchLatest(ctrl.signal), 5000);
    return () => {
      ctrl.abort();
      clearInterval(id);
    };
  }, []);

  const kpis = useMemo(() => {
    const ttv = events.filter(e => e.event === 'ttv_measured' && typeof e.props?.ms === 'number')
                      .map(e => Number(e.props!.ms));
    const p50 = percentile(ttv, 50);
    const p90 = percentile(ttv, 90);

    const req = events.filter(e => e.event === 'permission_requested');
    const grant = events.filter(e => e.event === 'permission_granted');
    const micGrant = req.length ? (grant.length / req.length) * 100 : 0;

    const bySession = new Map<string, { activation: boolean }>();
    for (const e of events) {
      const sid = e.session_hash || e.session_id || 'anon';
      const rec = bySession.get(sid) ?? { activation: false };
      if (e.event === 'activation') rec.activation = true;
      bySession.set(sid, rec);
    }
    const sessions = bySession.size || 1;
    const activationRate =
      (Array.from(bySession.values()).filter(v => v.activation).length / sessions) * 100;

    return { ttvCount: ttv.length, p50, p90, micGrant, activationRate };
  }, [events]);

  return (
    <main className="main-narrow" aria-labelledby="title">
      <h1 id="title" className="text-2xl mb-4">Analytics (live)</h1>

      <section aria-label="Key performance indicators" className="kpi-grid">
        <Kpi label="TTV p50" value={prettyMs(kpis.p50)} hint={`${kpis.ttvCount} samples`} />
        <Kpi label="TTV p90" value={prettyMs(kpis.p90)} hint={`${kpis.ttvCount} samples`} />
        <Kpi label="Mic grant" value={`${kpis.micGrant.toFixed(1)}%`} />
        <Kpi label="Activation" value={`${kpis.activationRate.toFixed(1)}%`} />
      </section>

      <section aria-label="Recent events" className="panel-light">
        <h2 className="text-lg mb-2">Recent events</h2>
        {loading ? <p>Loading...</p> : error ? <p role="alert">Error: {error}</p> : (
          <div role="table" aria-label="events table" className="table-scroll">
            <div role="row" className="grid-analytics-row grid-analytics-head">
              <div role="columnheader">Time</div>
              <div role="columnheader">Event</div>
              <div role="columnheader">Props</div>
            </div>
            {events.slice().reverse().map((e, i) => (
              <div key={i} role="row" className="grid-analytics-row row-divider">
                <div role="cell">{e.ts ? new Date(e.ts).toLocaleTimeString() : '-'}</div>
                <div role="cell">{e.event}</div>
                <div role="cell" className="mono-ellipsis">
                  {e.props ? JSON.stringify(e.props) : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel-light">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {hint ? <div className="text-xs text-muted mt-1">{hint}</div> : null}
    </div>
  );
}

