"use client";
import { useEffect, useState } from "react";

export default function PerfHUD() {
  const [txt, setTxt] = useState<string>("");

  useEffect(() => {
    try {
      // Lazy-load web-vitals if you want; here we rely on PerformanceObserver
      let cls = 0; let inp = 0; let fcp = 0;
      const poPaint = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === "first-contentful-paint") fcp = Math.round(e.startTime);
        update();
      }); poPaint.observe({ type: "paint", buffered: true });

      const poLayout = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) { // @ts-ignore
          cls += e.value || 0;
        } update();
      }); // @ts-ignore
      poLayout.observe({ type: "layout-shift", buffered: true });

      const poEvent = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          // @ts-ignore
          const dur = e.duration || 0;
          if (dur > inp) inp = Math.round(dur);
        }
        update();
      }); // @ts-ignore
      poEvent.observe({ type: "event", buffered: true, durationThreshold: 40 });

      function update() {
        setTxt(`FCP ${fcp}ms • INP ${inp}ms • CLS ${cls.toFixed(3)}`);
      }
    } catch {}
  }, []);

  if (!txt) return null;
  return (
    <div style={{
      position:"fixed", right:12, bottom:12, zIndex:1000,
      background:"var(--panel)", border:"1px solid rgba(255,255,255,.1)",
      padding:"6px 10px", borderRadius:8, color:"var(--muted)", fontSize:12
    }} aria-live="polite" aria-label="Performance indicators">
      {txt}
    </div>
  );
}
