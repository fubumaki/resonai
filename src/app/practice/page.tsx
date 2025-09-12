'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { micEngine, TelemetrySample } from '@/engine/audio/mic';
import { getAllSessions, putSession, SessionRecord } from '@/lib/db';

type State = 'IDLE' | 'WARMUP' | 'REFLECT' | 'DONE';

const SILENCE_RMS = 0.01; // soft threshold for voiced detection
const CLIP_RMS = 0.25; // show hint above this
const SKIP_AFTER_SEC = 30;
const WARMUP_SEC = 120;
const WARMUP_LOW_INTENSITY_SEC = 60;

type Heuristics = {
  voicedMs: number;
  totalMs: number;
  voicedTimePct: number;
  jitterEma: number;
  tiltEma: number;
};

function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60)
    .toString()
    .padStart(1, '0');
  const r = (s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
}

function computeFeedback(h: Heuristics, clipping: boolean): string {
  if (clipping) return 'Input is hot — lower mic or speak softer.';
  const options = [
    'Breath looks steady.',
    'Try gentler starts; lighten the onset.',
    'Nice: easier phonation showing up.',
    'Keep it light — think “buzzy lips”.',
    'Soften the volume; stay effortless.',
  ];
  // Slight bias based on jitter/tilt for variety
  if (h.jitterEma < 3) return options[0];
  if (h.tiltEma < 0.8) return options[2];
  return options[Math.floor((h.voicedTimePct * 10) % options.length)];
}

function Sparkline({ series, width = 240, height = 48 }: { series: (number | null)[]; width?: number; height?: number }) {
  const path = useMemo(() => {
    const values = series.filter((v): v is number => v != null && isFinite(v));
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const n = series.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const v = series[i];
      if (v == null || !isFinite(v)) continue;
      const x = (i / (n - 1)) * width;
      const y = height - ((v - min) / span) * height;
      d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }, [series, width, height]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block">
      <path d={path} stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function useMicSession(onSample: (s: TelemetrySample) => void) {
  const [granted, setGranted] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;
    async function go() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        setGranted(true);
        await micEngine.start(stream);
        unsub = micEngine.subscribe(onSample);
      } catch (e) {
        if (!cancelled) setGranted(false);
      }
    }
    go();
    return () => {
      cancelled = true;
      unsub?.();
      micEngine.stop();
    };
  }, [onSample]);
  return granted;
}

export default function PracticePage() {
  const [state, setState] = useState<State>('IDLE');
  const [lowIntensity, setLowIntensity] = useState(false);
  const targetSec = lowIntensity ? WARMUP_LOW_INTENSITY_SEC : WARMUP_SEC;
  const [running, setRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [clipping, setClipping] = useState(false);

  // Metrics
  const prevTsRef = useRef<number | null>(null);
  const prevF0Ref = useRef<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const voicedMsRef = useRef(0);
  const totalMsRef = useRef(0);
  const jitterEmaRef = useRef(0);
  const tiltEmaRef = useRef(1);
  const [f0Series, setF0Series] = useState<(number | null)[]>([]);
  const silenceMsRef = useRef(0);

  const heuristics: Heuristics = {
    voicedMs: voicedMsRef.current,
    totalMs: totalMsRef.current,
    voicedTimePct: totalMsRef.current > 0 ? voicedMsRef.current / totalMsRef.current : 0,
    jitterEma: jitterEmaRef.current,
    tiltEma: tiltEmaRef.current,
  };

  const granted = useMicSession((s) => {
    // Time deltas are based on message cadence
    const prevTs = prevTsRef.current;
    prevTsRef.current = s.ts;
    if (prevTs == null) return;
    const dt = Math.max(0, s.ts - prevTs);

    // Silence detection and auto pause/resume
    const isSilent = s.rms < SILENCE_RMS;
    if (isSilent) {
      silenceMsRef.current += dt;
      if (running && silenceMsRef.current > 5000) {
        setRunning(false);
        setAutoPaused(true);
      }
    } else {
      silenceMsRef.current = 0;
      if (autoPaused) {
        setRunning(true);
        setAutoPaused(false);
      }
    }

    // Clipping hint
    setClipping(s.rms > CLIP_RMS);

    // Update metrics only while running in WARMUP
    if (state === 'WARMUP' && running) {
      totalMsRef.current += dt;
      if (!isSilent) voicedMsRef.current += dt;
      setElapsedMs((v) => v + dt);

      // jitter proxy: EMA of abs semitone delta when both f0 present
      const prevF0 = prevF0Ref.current;
      if (s.f0Hz != null && prevF0 != null && isFinite(s.f0Hz) && isFinite(prevF0)) {
        const semitoneDelta = 12 * Math.log2(s.f0Hz / prevF0);
        const absDelta = Math.abs(semitoneDelta);
        const alpha = 0.1;
        jitterEmaRef.current = alpha * absDelta + (1 - alpha) * jitterEmaRef.current;
      }
      if (s.f0Hz != null && isFinite(s.f0Hz)) prevF0Ref.current = s.f0Hz;

      // tilt proxy: EMA of hf/lf ratio
      if (isFinite(s.hfLf)) {
        const alphaT = 0.05;
        tiltEmaRef.current = alphaT * s.hfLf + (1 - alphaT) * tiltEmaRef.current;
      }

      // f0 sparkline ring buffer
      setF0Series((arr) => {
        const next = arr.length > 240 ? arr.slice(arr.length - 239) : arr.slice();
        next.push(s.f0Hz ?? null);
        return next;
      });
    }
  });

  // Manage skip availability
  useEffect(() => {
    if (state === 'WARMUP') setCanSkip(elapsedMs / 1000 >= SKIP_AFTER_SEC);
  }, [elapsedMs, state]);

  // Transition when timer completes
  useEffect(() => {
    if (state === 'WARMUP') {
      const remaining = targetSec - elapsedMs / 1000;
      if (remaining <= 0) setState('REFLECT');
    }
  }, [elapsedMs, state, targetSec]);

  function resetWarmup(): void {
    setElapsedMs(0);
    voicedMsRef.current = 0;
    totalMsRef.current = 0;
    jitterEmaRef.current = 0;
    tiltEmaRef.current = 1;
    prevTsRef.current = null;
    prevF0Ref.current = null;
    setF0Series([]);
    silenceMsRef.current = 0;
    setAutoPaused(false);
    setClipping(false);
  }

  function startWarmup(): void {
    resetWarmup();
    setState('WARMUP');
    setRunning(true);
  }

  const remainingSec = Math.max(0, targetSec - elapsedMs / 1000);

  // Reflection sliders
  const [comfort, setComfort] = useState(0.5);
  const [fatigue, setFatigue] = useState(0.3);
  const [euphoria, setEuphoria] = useState(0.4);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    getAllSessions().then(setHistory).catch(() => {});
  }, [state]);

  function renderOrbDataUrl(): string {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;
    const radius = center - 2;
    // color from tilt (brightness) and jitter (saturation)
    const tilt = Math.max(0, Math.min(2, heuristics.tiltEma));
    const jitter = Math.max(0, Math.min(12, heuristics.jitterEma));
    const hue = 200 + (euphoria * 160 - 80); // bias by euphoria
    const sat = 40 + (10 - Math.min(10, jitter)) * 4; // less jitter → more saturation
    const light = 45 + Math.max(0, Math.min(45, (1 / (tilt + 0.2)) * 30));
    ctx.fillStyle = `hsl(${hue.toFixed(0)} ${sat.toFixed(0)}% ${light.toFixed(0)}%)`;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();
    // subtle shimmer ring from voiced pct
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2 + heuristics.voicedTimePct * 3;
    ctx.beginPath();
    ctx.arc(center, center, radius - 4, 0, Math.PI * 2);
    ctx.stroke();
    return canvas.toDataURL('image/png');
  }

  async function saveSessionAndFinish(): Promise<void> {
    setSaving(true);
    try {
      const orb = renderOrbDataUrl();
      const rec: SessionRecord = {
        ts: Date.now(),
        voicedTimePct: heuristics.voicedTimePct,
        jitterEma: heuristics.jitterEma,
        tiltEma: heuristics.tiltEma,
        comfort,
        fatigue,
        euphoria,
        orb,
        f0Series: f0Series.filter((v): v is number => v != null && isFinite(v)).slice(-240),
      };
      await putSession(rec);
      const all = await getAllSessions();
      setHistory(all);
      setState('DONE');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Practice</h1>
          <div className="text-sm text-muted-foreground" aria-live="polite">
            {granted === null && 'Requesting mic permission…'}
            {granted === true && 'Mic ready'}
            {granted === false && 'Mic denied'}
          </div>
        </div>

        {/* FSM panels */}
        {state === 'IDLE' && (
          <Card>
            <CardHeader>
              <CardTitle>Warmup drill (SOVT)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lowIntensity}
                      onChange={(e) => setLowIntensity(e.target.checked)}
                    />
                    Lower intensity (60s)
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={startWarmup} disabled={granted !== true}>
                  Start warmup
                </Button>
                <Button variant="secondary" asChild>
                  <a href="/listen">Mic check</a>
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                Do gentle lip trills or easy hums. Keep it light.
              </p>
            </CardContent>
          </Card>
        )}

        {state === 'WARMUP' && (
          <Card>
            <CardHeader>
              <CardTitle>Warmup in progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-3xl tabular-nums">{formatClock(remainingSec)}</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={running ? 'secondary' : 'default'} onClick={() => setRunning((r) => !r)}>
                    {running ? 'Pause' : 'Resume'}
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!canSkip} onClick={() => setState('REFLECT')}>
                    Next
                  </Button>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded bg-secondary">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${Math.min(100, ((elapsedMs / 1000) / targetSec) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className={clipping ? 'text-red-600' : 'text-muted-foreground'}>
                  {clipping ? 'Lower input: getting hot' : 'Keep it easy and quiet'}
                </div>
                {autoPaused && <div className="text-amber-600">Paused on silence — resume when voiced</div>}
              </div>

              <div className="rounded-md border p-3 text-sm">
                {computeFeedback(heuristics, clipping)}
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">F0 sparkline</div>
                <div className="text-muted-foreground">
                  <Sparkline series={f0Series} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">Voiced time</div>
                  {(heuristics.voicedTimePct * 100).toFixed(0)}%
                </div>
                <div>
                  <div className="font-medium text-foreground">Jitter proxy</div>
                  {heuristics.jitterEma.toFixed(1)} st
                </div>
                <div>
                  <div className="font-medium text-foreground">Tilt proxy</div>
                  {heuristics.tiltEma.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {state === 'REFLECT' && (
          <Card>
            <CardHeader>
              <CardTitle>Reflection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={typeof window !== 'undefined' ? renderOrbDataUrl() : ''} alt="Session orb" className="h-24 w-24 rounded-full border" />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">F0 sparkline</div>
                  <Sparkline series={f0Series} width={180} height={40} />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-sm">Comfort</div>
                  <Slider value={[comfort]} min={0} max={1} step={0.01} onValueChange={([v]) => setComfort(v)} />
                </div>
                <div>
                  <div className="mb-1 text-sm">Fatigue</div>
                  <Slider value={[fatigue]} min={0} max={1} step={0.01} onValueChange={([v]) => setFatigue(v)} />
                </div>
                <div>
                  <div className="mb-1 text-sm">Euphoria</div>
                  <Slider value={[euphoria]} min={0} max={1} step={0.01} onValueChange={([v]) => setEuphoria(v)} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={saveSessionAndFinish} disabled={saving}>
                  {saving ? 'Saving…' : 'Finish'}
                </Button>
                <Button variant="secondary" onClick={startWarmup}>Do it again</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {state === 'DONE' && (
          <Card>
            <CardHeader>
              <CardTitle>Saved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Session saved locally. You can run another warmup anytime.</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => setState('IDLE')}>Back to start</Button>
                <Button variant="secondary" onClick={startWarmup}>Do it again</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Simple history */}
        <div>
          <h2 className="mb-2 text-lg font-semibold">History</h2>
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">No sessions yet.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {history.map((s) => (
              <div key={s.ts} className="flex items-center gap-3 rounded-md border p-2">
                <img src={s.orb} alt="orb" className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{new Date(s.ts).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">
                    voiced {(s.voicedTimePct * 100).toFixed(0)}% · jitter {s.jitterEma.toFixed(1)} st · tilt {s.tiltEma.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
