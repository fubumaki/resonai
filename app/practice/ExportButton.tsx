'use client';

import { db } from '@/lib/db';
import { dispatchSessionProgressReset } from '@/src/sessionProgress';

type ImportedPayload = {
  version: number;
  exportedAt?: string;
  trials: Array<{
    ts: number;
    phrase: string;
    pitchMin: number; pitchMax: number;
    brightMin: number; brightMax: number;
    medianPitch: number | null;
    medianCentroid: number | null;
    inPitchPct: number;
    inBrightPct: number;
    pitchStabilityHz: number | null;
    score: number;
  }>;
};

export default function ExportButton() {
  const onExport = async () => {
    try {
      const trials = await (db as any).trials.orderBy('ts').reverse().limit(20).toArray();
      const payload = { version: 1, exportedAt: new Date().toISOString(), trials };
      downloadJson(payload, `resonai-session-${dateStr()}.json`);
      toast('Exported session JSON.');
    } catch {
      toast('Export failed (offline?)');
    }
  };

  const onImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as ImportedPayload;
        validate(data);
        // Insert, then trim to last 20 by ts
        if ((db as any).trials) {
          await (db as any).trials.bulkAdd(data.trials.map(t => ({ ...t })));
          const all = await (db as any).trials.orderBy('ts').toArray();
          const excess = Math.max(0, all.length - 20);
          if (excess > 0) {
            await (db as any).trials.bulkDelete(all.slice(0, excess).map((x: any) => x.id));
          }
        }
        // Optional event for any listeners (e.g., session summary)
        window.dispatchEvent(new CustomEvent('resonai:trials-imported', { detail: { count: data.trials.length }}));
        toast(`Imported ${data.trials.length} trials.`);
      } catch (e) {
        toast('Import failed: invalid file.');
      }
    };
    input.click();
  };

  const onClear = async () => {
    try {
      await (db as any).trials.clear();
      window.dispatchEvent(new CustomEvent('resonai:trials-cleared'));
      dispatchSessionProgressReset({ reason: 'trials-cleared', announcementPrefix: 'Trials cleared.' });
      toast('Trials cleared.');
    }
    catch { toast('Could not clear trials.'); }
  };

  return (
    <div className="flex gap-2 wrap">
      <button className="button" onClick={onExport}>Export last 20 trials</button>
      <button className="button btn-ghost" onClick={onImportClick}>
        Import trials (JSON)
      </button>
      <button className="button btn-ghost" onClick={onClear} title="Clear saved trials">
        Clear
      </button>
    </div>
  );
}

function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function dateStr(){ return new Date().toISOString().slice(0,10); }

function validate(d: ImportedPayload) {
  if (!d || typeof d !== 'object') throw new Error('bad');
  if (typeof d.version !== 'number') throw new Error('bad');
  if (!Array.isArray(d.trials)) throw new Error('bad');
}

function toast(msg: string) {
  const host = document.getElementById('toasts'); // exists from your layout
  if (!host) { alert(msg); return; }
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}