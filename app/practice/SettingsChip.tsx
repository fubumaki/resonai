'use client';

import { useEffect, useRef, useState } from 'react';
import type { PresetKey } from '@/lib/db';
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog';

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
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
    <div className="relative ml-auto">
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
          className="panel popover-panel"
        >
          <label className="col gap-6">
            <span className="badge">Profile</span>
            <select
              aria-label="Target profile"
              value={preset}
              onChange={(e) => onPreset(e.target.value as PresetKey)}
              className="select-input"
            >
              <option value="alto">Alto</option>
              <option value="mezzo">Mezzo</option>
              <option value="soprano">Soprano</option>
              <option value="custom">Custom</option>
            </select>
          </label>

          <label className="row items-center gap-8">
            <input type="checkbox" checked={lowPower} onChange={(e) => onLowPower(e.target.checked)} />
            <span>Low-power mode</span>
          </label>

          <div className="panel panel--dashed">
            <strong>Reset</strong>
            <div className="col gap-8 mt-6">
              <button className="button" onClick={() => { onResetToPresetDefaults(); setOpen(false); }}>Reset to preset defaults</button>
              <button className="button button-danger"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: 'Reset Everything',
                    description: 'Reset settings and clear saved trials?',
                    confirmText: 'Reset everything',
                    cancelText: 'Cancel',
                    confirmVariant: 'destructive',
                    onConfirm: () => {}
                  });
                  if (confirmed) {
                    onResetAll();
                    setOpen(false);
                  }
                }}>
                Reset everything
              </button>
            </div>
          </div>

          <p className="text-muted text-sm">
            Saved on this device only (IndexedDB). Close with <kbd>Esc</kbd>.
          </p>

          <div className="row justify-end">
            <button className="button" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

const FOCUS_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');
