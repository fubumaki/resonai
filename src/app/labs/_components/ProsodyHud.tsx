// src/app/labs/_components/ProsodyHud.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

export type ProsodyHudValues = {
  windowMs: number;
  minVoicedMs: number;
  rise: number;     // cents/sec
  fall: number;     // cents/sec (negative)
  ema: number;      // 0..1
  minSamples: number;
};

type Props = {
  defaults: ProsodyHudValues;
  onChange: (next: ProsodyHudValues) => void;
  /** persist to localStorage key if provided */
  persistKey?: string;
};

const wrapStyle: React.CSSProperties = {
  position: 'fixed',
  right: 12,
  bottom: 12,
  padding: 12,
  background: 'rgba(0,0,0,0.7)',
  color: '#fff',
  borderRadius: 10,
  zIndex: 9999,
  width: 280,
  fontSize: 13,
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
};

const labelStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8 };

export function ProsodyHud({ defaults, onChange, persistKey = 'prosody.hud' }: Props) {
  const [persist, setPersist] = useState(true);

  const initial = useMemo<ProsodyHudValues>(() => {
    if (!persistKey) return defaults;
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
    return defaults;
  }, [defaults, persistKey]);

  const [v, setV] = useState<ProsodyHudValues>(initial);

  // Write-through persistence
  useEffect(() => {
    if (!persist || !persistKey) return;
    try { localStorage.setItem(persistKey, JSON.stringify(v)); } catch {}
  }, [v, persist, persistKey]);

  // Notify parent
  useEffect(() => { onChange(v); }, [v, onChange]);

  const reset = () => setV(defaults);

  return (
    <div style={wrapStyle} data-testid="prosody-hud">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <strong>Prosody HUD</strong>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={persist}
            onChange={e => setPersist(e.target.checked)}
            aria-label="Persist settings"
          />
          Persist
        </label>
        <button onClick={reset} style={{ marginLeft: 8 }} aria-label="Reset prosody thresholds">
          Reset
        </button>
      </div>

      <div style={labelStyle}>
        <label htmlFor="p-window">Window (ms)</label>
        <input id="p-window" type="number" value={v.windowMs}
          onChange={e => setV({ ...v, windowMs: clampInt(e.target.value, 200, 3000, v.windowMs) })} />
      </div>
      <div style={labelStyle}>
        <label htmlFor="p-minvoiced">Min voiced (ms)</label>
        <input id="p-minvoiced" type="number" value={v.minVoicedMs}
          onChange={e => setV({ ...v, minVoicedMs: clampInt(e.target.value, 100, 1500, v.minVoicedMs) })} />
      </div>
      <div style={labelStyle}>
        <label htmlFor="p-rise">Rise (c/s)</label>
        <input id="p-rise" type="number" value={v.rise}
          onChange={e => setV({ ...v, rise: clampInt(e.target.value, 50, 800, v.rise) })} />
      </div>
      <div style={labelStyle}>
        <label htmlFor="p-fall">Fall (c/s)</label>
        <input id="p-fall" type="number" value={v.fall}
          onChange={e => setV({ ...v, fall: clampInt(e.target.value, -800, -50, v.fall) })} />
      </div>
      <div style={labelStyle}>
        <label htmlFor="p-ema">EMA α (0..1)</label>
        <input id="p-ema" type="number" step="0.05" value={v.ema}
          onChange={e => setV({ ...v, ema: clampFloat01(e.target.value, v.ema) })} />
      </div>
      <div style={labelStyle}>
        <label htmlFor="p-minsamp">Min samples</label>
        <input id="p-minsamp" type="number" value={v.minSamples}
          onChange={e => setV({ ...v, minSamples: clampInt(e.target.value, 2, 64, v.minSamples) })} />
      </div>
    </div>
  );
}

function clampInt(input: string, lo: number, hi: number, fallback: number) {
  const n = Math.round(Number(input));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fallback;
}
function clampFloat01(input: string, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback;
}
