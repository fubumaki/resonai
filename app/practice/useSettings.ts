'use client';

import { useCallback, useEffect, useState } from 'react';
import { db, defaultSettings, type SettingsRow } from '../lib/db';

export function useSettings() {
  const [settings, setSettings] = useState<SettingsRow>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if ((db as any).settings) {
          const s = await (db as any).settings.get('default');
          if (mounted && s) setSettings(s);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = useCallback(async (patch: Partial<SettingsRow>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      if ((db as any).settings) await (db as any).settings.put(next);
    } catch { /* no-op offline */ }
  }, [settings]);

  return { settings, save, loading };
}

