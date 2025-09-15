'use client';
import { useEffect, useRef, useState } from 'react';

export function PerfOverlay() {
  const [fps, setFps] = useState(0);
  const [p95, setP95] = useState(0);
  const [lagP95, setLagP95] = useState(0);

  const t = useRef({ last: performance.now(), arr: [] as number[], lag: [] as number[] });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now();
      const dt = now - t.current.last; t.current.last = now;
      t.current.arr.push(dt);
      if (t.current.arr.length > 120) t.current.arr.shift();
      const fpsNow = 1000 / (dt || 16.7);
      setFps(fpsNow);

      const sorted = [...t.current.arr].sort((a,b)=>a-b);
      const p95dt = sorted[Math.floor(0.95 * (sorted.length - 1))] || 0;
      setP95(p95dt);

      // If you stamp telem.t with performance.now() at the bridge, you can push UI lag deltas here.
      // Expose a simple global hook:
      (window as unknown as Record<string, unknown>).__pushUiLagMs = (lagMs: number) => {
        t.current.lag.push(lagMs);
        if (t.current.lag.length > 120) t.current.lag.shift();
        const s = [...t.current.lag].sort((a,b)=>a-b);
        setLagP95(s[Math.floor(0.95 * (s.length - 1))] || 0);
      };
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);


  return (
    <div className="overlay-fixed" data-testid="perf-overlay">
      <div className="font-bold mb-1">Performance</div>
      <div>FPS ~ {fps.toFixed(0)}</div>
      <div>Frame p95: {p95.toFixed(1)} ms</div>
      <div>Worklet→UI p95: {lagP95.toFixed(1)} ms</div>
    </div>
  );
}
