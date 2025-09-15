'use client';

import { useEffect, useMemo, useState } from 'react';

type Device = MediaDeviceInfo;

export default function DevicePicker({
  value,
  onChange,
  ec, ns, agc,
  onChangeConstraints,
  disabled
}: {
  value: string | null;
  onChange: (deviceId: string | null) => void;
  ec: boolean; ns: boolean; agc: boolean;
  onChangeConstraints: (next: { ec?: boolean; ns?: boolean; agc?: boolean }) => void;
  disabled?: boolean;
}) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;
        setDevices(list.filter(d => d.kind === 'audioinput'));
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? 'Could not enumerate devices.');
      }
    };
    load();
    // Refresh when device set changes (plug/unplug)
    navigator.mediaDevices.addEventListener?.('devicechange', load);
    return () => {
      navigator.mediaDevices.removeEventListener?.('devicechange', load);
      mounted = false;
    };
  }, []);

  const options = useMemo(() => devices.map(d => ({
    id: d.deviceId,
    label: d.label || 'Microphone',
  })), [devices]);

  return (
    <div className="panel col gap-8">
      <strong>Microphone</strong>
      {error && <div role="alert" className="panel panel-danger">{error}</div>}

      {options.length === 0 ? (
        <p className="badge">Allow microphone to choose a device.</p>
      ) : (
        <label className="col gap-6">
          <span className="sr-only">Input device</span>
          <select
            aria-label="Input device"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="select-input"
          >
            <option value="">System default</option>
            {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      )}

      <div className="row gap-12 wrap items-center">
        <label className="row gap-6 items-center">
          <input type="checkbox" checked={ec} onChange={(e) => onChangeConstraints({ ec: e.target.checked })} />
          <span>Echo cancellation</span>
        </label>
        <label className="row gap-6 items-center">
          <input type="checkbox" checked={ns} onChange={(e) => onChangeConstraints({ ns: e.target.checked })} />
          <span>Noise suppression</span>
        </label>
        <label className="row gap-6 items-center">
          <input type="checkbox" checked={agc} onChange={(e) => onChangeConstraints({ agc: e.target.checked })} />
          <span>Auto gain control</span>
        </label>
      </div>
      <p className="text-muted m-0 text-sm">
        Tip: choose a USB mic if available for steadier pitch tracking.
      </p>
    </div>
  );
}
