'use client';

import { useEffect, useRef, useState } from 'react';
import type { PresetKey } from '../../lib/db';

export default function SettingsChip({
  preset,
  onPreset,
  lowPower,
  onLowPower,
  onResetToPresetDefaults, // NEW
  onResetAll,              // NEW
}: {
  preset: PresetKey;
  onPreset: (p: PresetKey) => void;
  lowPower: boolean;
  onLowPower: (v: boolean) => void;
  onResetToPresetDefaults: () => void;
  onResetAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstFocus = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current!;
    // Focus first focusable
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUS_SELECTOR);
    firstFocus.current = focusables[0] || null;
    lastFocus.current = focusables[focusables.length - 1] || null;
    firstFocus.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      if (e.key === 'Tab' && focusables.length > 1) {
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === firstFocus.current) { e.preventDefault(); lastFocus.current?.focus(); }
        else if (!e.shiftKey && active === lastFocus.current) { e.preventDefault(); firstFocus.current?.focus(); }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!panel.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        className="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="settings-popover"
        onClick={() => setOpen(v => !v)}
      >
        Settings
      </button>

      {open && (
        <div
          id="settings-popover"
          ref={panelRef}
          role="dialog"
          aria-label="Settings"
          className="panel"
          style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 320, zIndex: 50, display: 'grid', gap: 10 }}
        >
          <label style={{ display: 'grid', gap: 6 }}>
            <span className="badge">Profile</span>
            <select
              aria-label="Target profile"
              value={preset}
              onChange={(e) => onPreset(e.target.value as PresetKey)}
              style={{ background: 'transparent', color: 'var(--text)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 8, padding: '6px 10px' }}
            >
              <option value="alto">Alto</option>
              <option value="mezzo">Mezzo</option>
              <option value="soprano">Soprano</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={lowPower} onChange={(e) => onLowPower(e.target.checked)} />
            <span>Low‑power mode</span>
          </label>

          <div className="panel" style={{ background: 'transparent', borderStyle: 'dashed' }}>
            <strong>Reset</strong>
            <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
              <button className="button" onClick={() => { onResetToPresetDefaults(); setOpen(false); }}>Reset to preset defaults</button>
              <button className="button"
                onClick={() => { if (confirm('Reset settings and clear saved trials?')) { onResetAll(); setOpen(false); } }}
                style={{ background: 'var(--danger)' }}>
                Reset everything
              </button>
            </div>
          </div>

          <p style={{ color: 'var(--muted)', fontSize: 12 }}>
            Saved on this device only (IndexedDB). Close with <kbd>Esc</kbd>.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="button" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const FOCUS_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');