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

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    right: 12,
    top: 12,
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
    zIndex: 9999,
    minWidth: '160px'
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: 4,
    padding: '2px 6px',
    fontSize: 11,
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  };

  return (
    <div style={containerStyle} data-testid="telemetry-recorder">
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Telemetry</div>
      <div>Frames: {count}</div>
      <button onClick={save} style={buttonStyle}>
        Save JSON
      </button>
      <button onClick={clear} style={{ ...buttonStyle, marginLeft: 4, background: '#dc2626' }}>
        Clear
      </button>
    </div>
  );
}
