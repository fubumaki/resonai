"use client";
import { useEffect, useState } from "react";

interface LayoutShift extends PerformanceEntry {
  value: number;
}

interface PerformanceEventTiming extends PerformanceEntry {
  duration: number;
}

interface EventObserverInit extends PerformanceObserverInit {
  durationThreshold?: number;
}

export default function PerfHUD() {
  const [txt, setTxt] = useState<string>("");

  useEffect(() => {
    try {
      // Lazy-load web-vitals if you want; here we rely on PerformanceObserver
      let cls = 0;
      let inp = 0;
      let fcp = 0;
      const poPaint = new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.name === "first-contentful-paint") fcp = Math.round(e.startTime);
        }
        update();
      });
      poPaint.observe({ type: "paint", buffered: true });

      const poLayout = new PerformanceObserver((l) => {
        for (const e of l.getEntries() as LayoutShift[]) {
          cls += e.value;
        }
        update();
      });
      poLayout.observe({ type: "layout-shift", buffered: true });

      const poEvent = new PerformanceObserver((l) => {
        for (const e of l.getEntries() as PerformanceEventTiming[]) {
          const dur = e.duration;
          if (dur > inp) inp = Math.round(dur);
        }
        update();
      });
      const eventObserverInit: EventObserverInit = {
        type: "event",
        buffered: true,
        durationThreshold: 40,
      };
      poEvent.observe(eventObserverInit);

      function update() {
        setTxt(`FCP ${fcp}ms - INP ${inp}ms - CLS ${cls.toFixed(3)}`);
      }
    } catch (error) {
      console.error("Failed to initialize performance observers", error);
      setTxt("Performance metrics are unavailable.");
    }
  }, []);

  if (!txt) return null;
  return (
    <div className="perf-hud" aria-live="polite" aria-label="Performance indicators">
      {txt}
    </div>
  );
}
