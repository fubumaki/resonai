'use client';
import { useRef, useState } from 'react';

export function Recorder() {
  const buf = useRef<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);

  // Call this from your bridge when a Telemetry frame arrives:
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__pushTelem = (frame: Record<string, unknown>) => {
      buf.current.push(frame);
      if (buf.current.length > 1800) buf.current.shift(); // ~30s @ ~60fps
      setCount(buf.current.length);
    };
  }

  const save = () => {
    const payload = {
      buildSha: process.env.NEXT_PUBLIC_BUILD_SHA ?? 'dev',
      ts: Date.now(),
      samples: buf.current
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `telemetry-${payload.ts}.json`;
    a.click();
  };

  const clear = () => {
    buf.current = [];
    setCount(0);
  };


  return (
    <div className="recorder-fixed" data-testid="telemetry-recorder">
      <div className="font-bold mb-1">Telemetry</div>
      <div>Frames: {count}</div>
      <button onClick={save} className="hud-button">
        Save JSON
      </button>
      <button onClick={clear} className="hud-button hud-button-danger">
        Clear
      </button>
    </div>
  );
}
