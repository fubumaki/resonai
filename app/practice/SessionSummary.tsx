"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TrialResult } from "./Trials";

type Row = TrialResult & { ts: number };

export default function SessionSummary() {
  const [rows, setRows] = useState<Row[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Listen for trials from Trials.tsx (see patch in section 2)
  useEffect(() => {
    const onTrial = (e: Event) => {
      const detail = (e as CustomEvent<TrialResult>).detail;
      const row: Row = { ...detail, ts: Date.now() };
      setRows(prev => [...prev.slice(-19), row]); // keep last 20 in memory
    };
    window.addEventListener("resonai:trial-complete", onTrial as EventListener);
    return () => window.removeEventListener("resonai:trial-complete", onTrial as EventListener);
  }, []);

  // Draw line chart of Score (0..100)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 700, H = 180;
    el.style.width = "100%";
    el.style.height = `${H}px`;
    const rect = el.getBoundingClientRect();
    const w = Math.max(320, rect.width || W);
    el.width = Math.floor(w * dpr);
    el.height = Math.floor(H * dpr);
    ctx.scale(dpr, dpr);

    // background
    ctx.clearRect(0, 0, w, H);
    const m = { l: 36, r: 12, t: 8, b: 22 };
    const gw = w - m.l - m.r;
    const gh = H - m.t - m.b;

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.1)";
    ctx.lineWidth = 1;
    [0, 20, 40, 60, 80, 100].forEach((val) => {
      const y = m.t + gh - (val / 100) * gh;
      ctx.beginPath();
      ctx.moveTo(m.l, y);
      ctx.lineTo(w - m.r, y);
      ctx.stroke();
      ctx.fillStyle = "var(--muted)";
      ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(String(val), 4, y + 4);
    });

    // early return if nothing
    if (rows.length === 0) {
      ctx.fillStyle = "var(--muted)";
      ctx.fillText("No trials yet — press Start trial.", m.l, m.t + 16);
      return;
    }

    // x scale (even spacing), y scale (0..100)
    const xs = (i: number) => m.l + (rows.length === 1 ? gw / 2 : (gw * i) / (rows.length - 1));
    const ys = (score: number) => m.t + gh - (gh * Math.max(0, Math.min(100, score))) / 100;

    // line
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#7c5cff";
    ctx.beginPath();
    rows.forEach((r, i) => {
      const x = xs(i);
      const y = ys(r.score);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // markers
    ctx.fillStyle = "#ffffff";
    rows.forEach((r, i) => {
      const x = xs(i);
      const y = ys(r.score);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // average line
    const avg = rows.reduce((a, r) => a + r.score, 0) / rows.length;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,.4)";
    ctx.beginPath();
    ctx.moveTo(m.l, ys(avg));
    ctx.lineTo(w - m.r, ys(avg));
    ctx.stroke();
    ctx.setLineDash([]);

  }, [rows]);

  const exportCsv = () => {
    const header = "time,score,medianPitch,medianCentroid,inPitchPct,inBrightPct,stabilityHz,phrase\n";
    const body = rows.map(r =>
      [
        new Date(r.ts).toISOString(),
        r.score,
        r.medianPitch ?? "",
        r.medianCentroid ?? "",
        r.inPitchPct,
        r.inBrightPct,
        r.pitchStabilityHz ?? "",
        `"${(r.phrase || "").replace(/"/g, '""')}"`
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `resonai-trials-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const readable = useMemo(() =>
    rows.map((r, i) => ({
      idx: rows.length - i,
      time: new Date(r.ts).toLocaleTimeString(),
      score: r.score,
      pitch: r.medianPitch ?? "—",
      bright: r.medianCentroid ?? "—"
    })), [rows]);

  return (
    <section className="panel" data-testid="session-summary" aria-label="Session summary">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <strong>Session summary</strong>
        <button className="button" onClick={exportCsv}>Export chart data (CSV)</button>
      </div>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Line chart of last trials' scores"
        style={{ width: "100%", display: "block", marginTop: 8, borderRadius: 8 }}
      />

      <div className="panel" style={{ marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead style={{ color: "var(--muted)" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>#</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Time</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Score</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Pitch</th>
              <th style={{ textAlign: "left", padding: "4px 6px" }}>Bright</th>
            </tr>
          </thead>
          <tbody>
            {readable.slice().reverse().map((r, i) => (
              <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <td style={{ padding: "6px" }}>{r.idx}</td>
                <td style={{ padding: "6px" }}>{r.time}</td>
                <td style={{ padding: "6px" }}>{r.score}</td>
                <td style={{ padding: "6px" }}>{r.pitch}</td>
                <td style={{ padding: "6px" }}>{r.bright}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

