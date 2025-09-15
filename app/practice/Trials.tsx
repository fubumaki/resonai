"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type TrialResult = {
  phrase: string;
  durationMs: number;
  inPitchPct: number;
  inBrightPct: number;
  medianPitch: number | null;
  medianCentroid: number | null;
  pitchStabilityHz: number | null; // lower is better
  score: number; // 0..100
};

type StreamSample = { t: number; pitch: number | null; centroid: number | null; inPitch: boolean; inBright: boolean };

function median(xs: number[]) {
  if (xs.length === 0) return null;
  const a = xs.slice().sort((a,b)=>a-b);
  const m = Math.floor(a.length/2);
  return a.length%2? a[m] : (a[m-1]+a[m])/2;
}

function mad(xs: number[]) { // median absolute deviation
  const m = median(xs);
  if (m == null) return null;
  const dev = xs.map(v => Math.abs(v - m));
  return median(dev);
}

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

export default function Trials({
  phrase = "see the green tree",
  getSnapshot,         // returns the latest stream values (pitch, centroid, in-range flags)
  targets,             // { pitch:{min,max}, bright:{min,max} }
  onComplete,          // callback when trial completes
}: {
  phrase?: string;
  getSnapshot: () => { pitch: number | null; centroid: number | null; inPitch: boolean; inBright: boolean };
  targets: { pitch:{min:number,max:number}, bright:{min:number,max:number} };
  onComplete?: (res: TrialResult) => void;
}) {
  const [active, setActive] = useState(false);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [countdown, setCountdown] = useState<0|1|2|3>(0);

  const buf = useRef<StreamSample[]>([]);
  const startedAt = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  // capture loop while trial is active
  useEffect(() => {
    if (!active) return;

    const tick = (t: number) => {
      const s = getSnapshot();
      buf.current.push({ t: performance.now(), pitch: s.pitch, centroid: s.centroid, inPitch: s.inPitch, inBright: s.inBright });
      if (startedAt.current && performance.now() - startedAt.current >= 2000) { // 2s trial
        finish();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const start = async () => {
    if (active) return;
    buf.current = [];
    startedAt.current = null;
    // 3..1..go micro-countdown (visual rhythm)
    setCountdown(3); await wait(350);
    setCountdown(2); await wait(350);
    setCountdown(1); await wait(350);
    setCountdown(0);
    startedAt.current = performance.now();
    setActive(true);
  };

  const finish = () => {
    setActive(false);
    const samples = buf.current;
    const durationMs = samples.length ? (samples[samples.length-1].t - samples[0].t) : 0;

    const voiced = samples.filter(s => s.pitch != null && s.centroid != null);
    const pitchVals = voiced.map(s => s.pitch!) as number[];
    const centVals  = voiced.map(s => s.centroid!) as number[];
    const inPitchPct = samples.length ? (samples.filter(s => s.inPitch).length / samples.length) * 100 : 0;
    const inBrightPct= samples.length ? (samples.filter(s => s.inBright).length / samples.length) * 100 : 0;

    const medPitch = median(pitchVals);
    const medCent  = median(centVals);
    const stab     = mad(pitchVals); // Hz

    // Simple scoring: range (60%), stability (25%), voiced presence (15%)
    const rangeScore = 0.6 * (0.5 * norm(inPitchPct, 0, 100) + 0.5 * norm(inBrightPct, 0, 100));
    const stabilityScore = 0.25 * (stab == null ? 0.5 : clamp(1 - (stab / 15), 0, 1)); // 0Hz=perfect, 15Hz≈ok
    const voicedScore = 0.15 * clamp(voiced.length / Math.max(1, samples.length), 0, 1);
    const score = Math.round(100 * (rangeScore + stabilityScore + voicedScore));

    const res: TrialResult = {
      phrase,
      durationMs: Math.round(durationMs),
      inPitchPct: Math.round(inPitchPct),
      inBrightPct: Math.round(inBrightPct),
      medianPitch: medPitch ? Math.round(medPitch) : null,
      medianCentroid: medCent ? Math.round(medCent) : null,
      pitchStabilityHz: stab ? Math.round(stab) : null,
      score
    };
    setResults(prev => [res, ...prev].slice(0, 5));
    onComplete?.(res);
    // Notify other components (SessionSummary) without coupling
    window.dispatchEvent(new CustomEvent("resonai:trial-complete", { detail: res }));
  };

  return (
    <div className="panel col gap-2">
      <div className="flex gap-2 align-base wrap">
        <strong>Phrase trial</strong>
        <span className="badge">Say: "{phrase}"</span>
      </div>

      <div className="flex gap-2 items-center">
        {!active ? (
          <button className="button" onClick={start} aria-label="Start trial">Start trial</button>
        ) : (
          <button className="button" onClick={finish} aria-label="Stop trial">Stop</button>
        )}
        {countdown !== 0 && <span className="badge" aria-live="assertive">{countdown}</span>}
        {active && <span className="badge" aria-live="polite">Recording...</span>}
      </div>

      {results.length > 0 && (
        <div className="col gap-2">
          {results.map((r, i) => (
            <div key={i} className="panel col gap-1">
              <div className="flex gap-2 align-base justify-between">
                <div><strong>Score</strong> {r.score}/100</div>
                <div className="text-muted">{Math.round(r.durationMs/100)/10}s</div>
              </div>
              <div className="flex gap-3 wrap text-muted">
                <span className="badge">Pitch {r.medianPitch ?? "-"} Hz</span>
                <span className="badge">Bright {r.medianCentroid ?? "-"} Hz</span>
                <span className="badge">In-pitch {r.inPitchPct}%</span>
                <span className="badge">In-bright {r.inBrightPct}%</span>
                {r.pitchStabilityHz != null && <span className="badge">Stability ±{r.pitchStabilityHz} Hz</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function wait(ms: number){ return new Promise(r => setTimeout(r, ms)); }
function norm(x:number, a:number, b:number){ return clamp((x - a) / (b - a), 0, 1); }
