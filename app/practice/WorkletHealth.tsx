"use client";

import { useEffect, useMemo, useState } from "react";

export default function WorkletHealth({ intervalsRef }:{
  intervalsRef: React.MutableRefObject<number[]>
}) {
  const [stamp, setStamp] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStamp(s => s + 1), 800);
    return () => clearInterval(id);
  }, []);

  const { mean, p95, status, desc } = useMemo(() => {
    const arr = intervalsRef.current.slice(-100);
    if (arr.length < 10) return { mean: null as number | null, p95: null as number | null, status: "Measuring…" , desc: "" };
    const sorted = arr.slice().sort((a,b)=>a-b);
    const m = sorted.reduce((a,v)=>a+v,0)/sorted.length;
    const p = sorted[Math.floor(sorted.length * 0.95)];
    let s = "Good", d = "Low jitter";
    if (p > 60 || m > 35) { s = "At risk"; d = "High jitter"; }
    else if (p > 40 || m > 25) { s = "OK"; d = "Some jitter"; }
    return { mean: Math.round(m), p95: Math.round(p), status: s, desc: d };
  }, [stamp, intervalsRef]);

  return (
    <div className="panel row align-base gap-10">
      <strong>Engine:</strong>
      <span className="badge" aria-live="polite">{status}</span>
      {mean != null && p95 != null && (
        <span className="badge" title="Message interval statistics">μ {mean}ms • p95 {p95}ms</span>
      )}
      <span className="text-muted">{desc}</span>
    </div>
  );
}

