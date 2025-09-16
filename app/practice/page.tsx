"use client";

import { useEffect, useRef, useState, useMemo, useReducer, useCallback } from "react";
import Trials from "./Trials";
import { db, defaultSettings } from '@/lib/db';
import { useSettings } from './useSettings';
import SettingsChip from './SettingsChip';
import ExportButton from './ExportButton';
import SessionSummary from './SessionSummary';
import WorkletHealth from './WorkletHealth';
import DevicePicker from './DevicePicker';
import Meter from './ui/Meter';
import TargetBar from './ui/TargetBar';
import ProgressBar from '@/components/ProgressBar';
import Orb from '@/components/Orb';
import { hzToNote } from '@/lib/pitch';
import Script from 'next/script';
import {
  trackSessionProgress,
  createSessionProgressState,
  sessionProgressAnnouncementReducer,
  SESSION_PROGRESS_RESET_EVENT,
  type SessionProgressResetDetail,
} from '@/src/sessionProgress';
import type { TrialResult } from './Trials';

type PresetKey = "alto" | "mezzo" | "soprano" | "custom";
type Range = { min: number; max: number };
type Preset = { name: string; pitch: Range; bright: Range; note: string };

const PRESETS: Record<PresetKey, Preset> = {
  alto: { name: "Alto", pitch: { min: 165, max: 200 }, bright: { min: 1500, max: 2500 }, note: "Warm, relaxed" },
  mezzo: { name: "Mezzo", pitch: { min: 180, max: 220 }, bright: { min: 1800, max: 2800 }, note: "Balanced focus" },
  soprano: { name: "Soprano", pitch: { min: 200, max: 260 }, bright: { min: 2000, max: 3200 }, note: "Light, bright" },
  custom: { name: "Custom", pitch: { min: 170, max: 220 }, bright: { min: 1800, max: 2800 }, note: "Tweak to taste" }
};

const TOTAL_TRIALS = 10;

declare global {
  interface Window {
    __setPracticeReady?: (value: boolean) => void;
    __setPracticeProgress?: (
      value: number,
      options?: { totalSteps?: number; announcementPrefix?: string }
    ) => void;
  }
}

// Pending test state captured before React effects attach
let __pendingPracticeReady: boolean | undefined;
let __pendingPracticeProgress: number | undefined;

// Expose test hooks as early as possible so Playwright can call them right after navigation
if (typeof window !== 'undefined') {
  if (!window.__setPracticeReady) {
    window.__setPracticeReady = (value: boolean) => {
      __pendingPracticeReady = !!value;
      try { window.dispatchEvent(new CustomEvent('practice:set-ready', { detail: !!value })); } catch { }
    };
  }
  if (!window.__setPracticeProgress) {
    window.__setPracticeProgress = (value: number) => {
      const safeValue = Math.min(Math.max(Math.round(value), 0), TOTAL_TRIALS);
      __pendingPracticeProgress = safeValue;
      try { window.dispatchEvent(new CustomEvent('practice:set-progress', { detail: safeValue })); } catch { }
    };
  }
}

function useAudioUnlock(ctxRef: React.MutableRefObject<AudioContext | null>) {
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const check = () => setNeedsUnlock(ctx.state === "suspended");
    check();
    const onState = () => check();
    ctx.addEventListener("statechange", onState);
    return () => ctx.removeEventListener("statechange", onState);
  }, []);

  const unlock = async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try { await ctx.resume(); } catch { }
  };
  return { needsUnlock, unlock };
}

export default function Practice() {
  const [preset, setPreset] = useState<PresetKey>("mezzo");
  const [pitchTarget, setPitchTarget] = useState<Range>(PRESETS.mezzo.pitch);
  const [brightTarget, setBrightTarget] = useState<Range>(PRESETS.mezzo.bright);

  const [ready, setReady] = useState<boolean>(() => {
    try { return typeof __pendingPracticeReady === 'boolean' ? !!__pendingPracticeReady : false; } catch { return false; }
  });
  const [err, setErr] = useState<string | null>(null);

  const [level, setLevel] = useState(0);
  const [dbfs, setDbfs] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [centroid, setCentroid] = useState<number | null>(null);
  const [h1h2, setH1H2] = useState<number | null>(null);
  const [clarity, setClarity] = useState(0);
  const [lowPower, setLowPower] = useState(false);
  const [sessionProgress, setSessionProgress] = useState<number>(() => {
    try {
      return typeof __pendingPracticeProgress === 'number'
        ? Math.min(Math.max(Math.round(__pendingPracticeProgress), 0), TOTAL_TRIALS)
        : 0;
    } catch { return 0; }
  });
  const [sessionProgressAnnouncement, dispatchSessionProgressAnnouncement] = useReducer(
    sessionProgressAnnouncementReducer,
    createSessionProgressState(TOTAL_TRIALS)
  );

  // Audio device settings
  const [inputDeviceId, setInputDeviceId] = useState<string | null>(null);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(false);

  const inPitch = useMemo(() => pitch != null && pitch >= pitchTarget.min && pitch <= pitchTarget.max, [pitch, pitchTarget]);
  const inBright = useMemo(() => centroid != null && centroid >= brightTarget.min && centroid <= brightTarget.max, [centroid, brightTarget]);

  const tip = useCoachTip({ pitch, centroid, h1h2, inPitch, inBright });

  const { settings, save, loading } = useSettings();

  const mediaStream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const worklet = useRef<AudioWorkletNode | null>(null);
  const mute = useRef<GainNode | null>(null);

  // Worklet health tracking
  const intervalsRef = useRef<number[]>([]);
  const lastMsgRef = useRef<number>(performance.now());

  const { needsUnlock, unlock } = useAudioUnlock(audioCtx);

  // Load saved settings on first load
  useEffect(() => {
    if (loading) return;
    setPreset(settings.preset);
    setPitchTarget({ min: settings.pitchMin, max: settings.pitchMax });
    setBrightTarget({ min: settings.brightMin, max: settings.brightMax });
    setLowPower(settings.lowPower ?? false);
    setInputDeviceId(settings.inputDeviceId ?? null);
    setEchoCancellation(settings.echoCancellation);
    setNoiseSuppression(settings.noiseSuppression);
    setAutoGainControl(settings.autoGainControl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Auto-save when settings change
  useEffect(() => { if (!loading) save({ preset }); }, [preset, loading, save]);
  useEffect(() => { if (!loading) save({ pitchMin: pitchTarget.min, pitchMax: pitchTarget.max }); }, [pitchTarget, loading, save]);
  useEffect(() => { if (!loading) save({ brightMin: brightTarget.min, brightMax: brightTarget.max }); }, [brightTarget, loading, save]);
  useEffect(() => { if (!loading) save({ lowPower }); }, [lowPower, loading, save]);
  useEffect(() => { if (!loading) save({ inputDeviceId }); }, [inputDeviceId, loading, save]);
  useEffect(() => { if (!loading) save({ echoCancellation, noiseSuppression, autoGainControl }); }, [echoCancellation, noiseSuppression, autoGainControl, loading, save]);

  useEffect(() => {
    // Switch preset updates targets unless "custom"
    if (preset !== "custom") {
      setPitchTarget(PRESETS[preset].pitch);
      setBrightTarget(PRESETS[preset].bright);
    }
  }, [preset]);

  // Refactored audio initialization function
  const startAudio = async () => {
    // tear down old
    mediaStream.current?.getTracks().forEach(t => t.stop());
    analyser.current?.disconnect();
    source.current?.disconnect();
    worklet.current?.disconnect();
    mute.current?.disconnect();

    // create/reuse context
    const ctx = audioCtx.current ?? new (window.AudioContext || (window as any).webkitAudioContext)({ latencyHint: "interactive" });
    audioCtx.current = ctx;

    const build = (forceDefault = false): MediaStreamConstraints => ({
      audio: {
        deviceId: !forceDefault && inputDeviceId ? { exact: inputDeviceId } : undefined,
        echoCancellation,
        noiseSuppression,
        autoGainControl,
      }
    });

    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia(build(false));
    } catch (e: any) {
      // Typical when device unplugged or permission changes
      mediaStream.current = await navigator.mediaDevices.getUserMedia(build(true));
      toast("Selected mic unavailable - using system default.");
    }

    source.current = audioCtx.current.createMediaStreamSource(mediaStream.current);

    // analyser for level
    analyser.current = audioCtx.current.createAnalyser();
    analyser.current.fftSize = 2048;
    source.current.connect(analyser.current);

    // worklet
    if (!worklet.current) {
      await audioCtx.current.audioWorklet.addModule("/worklets/pitch.worklet.js");
      worklet.current = new AudioWorkletNode(audioCtx.current, "pitch-processor");
      worklet.current.port.onmessage = ({ data }) => {
        const p = data.pitch ? Math.round(data.pitch) : null;
        setPitch((prev) => smooth(prev, p));
        setCentroid(data.centroidHz ? Math.round(data.centroidHz) : null);
        setH1H2(data.h1h2 ?? null);
        setClarity(data.clarity ?? 0);

        // Track worklet message intervals for health monitoring
        const now = performance.now();
        intervalsRef.current.push(now - lastMsgRef.current);
        lastMsgRef.current = now;
        if (intervalsRef.current.length > 200) intervalsRef.current.shift();
      };
    }

    // mute to avoid feedback
    mute.current = audioCtx.current.createGain();
    mute.current.gain.value = 0;
    source.current.connect(worklet.current!);
    worklet.current!.connect(mute.current).connect(audioCtx.current.destination);
    worklet.current!.port.postMessage({ minHz: 70, maxHz: 500, voicingRms: 0.012 });
  };

  useEffect(() => {
    // Apply any pending ready flag set before listeners attached
    try {
      if (typeof __pendingPracticeReady === 'boolean') {
        setReady(!!__pendingPracticeReady);
      }
    } catch { }

    (async () => {
      try {
        await startAudio();
        setReady(true);
        // Apply any pending test state immediately after first ready
        if (typeof __pendingPracticeProgress === 'number') {
          const v = Math.min(Math.max(Math.round(__pendingPracticeProgress), 0), TOTAL_TRIALS);
          setSessionProgress(v);
        }
      } catch (e: any) { setErr(e?.message ?? "Microphone permission denied."); }
    })();
    return () => {
      mediaStream.current?.getTracks().forEach(t => t.stop());
      audioCtx.current?.close();
    };
  }, []);

  // Restart audio when device/constraints change
  useEffect(() => {
    if (!ready) return;
    (async () => {
      try { await startAudio(); } catch (e: any) { setErr(e?.message ?? "Device change failed."); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputDeviceId, echoCancellation, noiseSuppression, autoGainControl]);

  // Handle device hot-plug
  useEffect(() => {
    const onChange = () => startAudio().catch(() => { });
    navigator.mediaDevices.addEventListener?.("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", onChange);
  }, [ready, inputDeviceId, echoCancellation, noiseSuppression, autoGainControl]);

  const handleSessionProgressReset = useCallback((announcementPrefix?: string) => {
    setSessionProgress(0);
    dispatchSessionProgressAnnouncement({
      type: 'reset',
      totalSteps: TOTAL_TRIALS,
      announcementPrefix,
    });
  }, [dispatchSessionProgressAnnouncement]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSessionProgressReset: EventListener = (event) => {
      const detail = (event as CustomEvent<SessionProgressResetDetail>).detail;
      handleSessionProgressReset(detail?.announcementPrefix);
    };

    window.addEventListener(SESSION_PROGRESS_RESET_EVENT, onSessionProgressReset);
    return () => window.removeEventListener(SESSION_PROGRESS_RESET_EVENT, onSessionProgressReset);
  }, [handleSessionProgressReset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onReady = (e: Event) => setReady(!!(e as CustomEvent<boolean>).detail);
    const onProgress = (e: Event) => {
      const safeValue = Math.min(Math.max(Math.round((e as CustomEvent<number>).detail ?? 0), 0), TOTAL_TRIALS);
      setSessionProgress(safeValue);
      dispatchSessionProgressAnnouncement({ type: 'progress', completed: safeValue, totalSteps: TOTAL_TRIALS });
    };
    window.addEventListener('practice:set-ready', onReady as EventListener);
    window.addEventListener('practice:set-progress', onProgress as EventListener);
    return () => {
      window.removeEventListener('practice:set-ready', onReady as EventListener);
      window.removeEventListener('practice:set-progress', onProgress as EventListener);
    };
  }, [dispatchSessionProgressAnnouncement]);

  const rafLevel = () => {
    const data = new Uint8Array(analyser.current!.fftSize);
    const lastRef = useRef(0);
    const tick = () => {
      const now = performance.now();
      const interval = lowPower ? 100 : 16; // 10 fps vs ~60 fps
      if (now - lastRef.current >= interval) {
        analyser.current!.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 2));

        // Calculate dBFS
        const db = 20 * Math.log10(rms + 1e-7);
        setDbfs(Math.max(-60, Math.min(-6, db)));
        lastRef.current = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const onTrialComplete = async (r: TrialResult) => {
    try {
      await (db as any).trials.add({
        ts: Date.now(),
        phrase: r.phrase,
        pitchMin: pitchTarget.min,
        pitchMax: pitchTarget.max,
        brightMin: brightTarget.min,
        brightMax: brightTarget.max,
        medianPitch: r.medianPitch,
        medianCentroid: r.medianCentroid,
        inPitchPct: r.inPitchPct,
        inBrightPct: r.inBrightPct,
        pitchStabilityHz: r.pitchStabilityHz,
        score: r.score,
      });
      // Trim to last 20
      const count = await (db as any).trials.count();
      if (count > 20) {
        const old = await (db as any).trials.orderBy('ts').toArray();
        const excess = old.length - 20;
        await (db as any).trials.bulkDelete(old.slice(0, excess).map((x: any) => x.id));
      }

      // Update session progress (increment by 1 for each completed trial)
      setSessionProgress(prev => {
        const next = Math.min(prev + 1, TOTAL_TRIALS); // Cap at TOTAL_TRIALS trials
        if (next !== prev) {
          trackSessionProgress(next, TOTAL_TRIALS);
          dispatchSessionProgressAnnouncement({
            type: 'progress',
            completed: next,
            totalSteps: TOTAL_TRIALS,
          });
        }
        return next;
      });
    } catch {/* offline/no-op */ }
  };

  const onCustom = (setter: (r: Range) => void, r: Range) => {
    setPreset("custom");
    setter(r);
  };

  // Toast helper
  const toast = (msg: string) => {
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  };

  // Reset handlers
  const resetToPresetDefaults = () => {
    // Use the currently selected preset's defaults
    const p = PRESETS[preset];
    setPitchTarget({ ...p.pitch });
    setBrightTarget({ ...p.bright });
    handleSessionProgressReset('Practice data reset.');
    toast('Practice data reset');
  };

  const resetAll = async () => {
    // Settings → defaults
    setPreset(defaultSettings.preset);
    setPitchTarget({ min: defaultSettings.pitchMin, max: defaultSettings.pitchMax });
    setBrightTarget({ min: defaultSettings.brightMin, max: defaultSettings.brightMax });
    setLowPower(false);
    try { await (db as any).trials.clear(); } catch { }
    handleSessionProgressReset('Practice data reset.');
    toast('Practice data reset');
  };

  return (
    <section className="hero">
      <Script src="/practice-hooks.js" strategy="beforeInteractive" />
      <h1>Practice</h1>

      <div className="flex gap-12 items-center justify-between wrap mb-4">
        <div className="text-muted">
          {preset.toUpperCase()} • Pitch {pitchTarget.min}-{pitchTarget.max} Hz • Bright {brightTarget.min}-{brightTarget.max} Hz
        </div>
        <SettingsChip
          preset={preset}
          onPreset={(p) => setPreset(p)}
          lowPower={lowPower}
          onLowPower={setLowPower}
          onResetToPresetDefaults={resetToPresetDefaults}
          onResetAll={resetAll}
        />
      </div>

      {/* Session Progress */}
      {(ready || (typeof (window as any).__practicePendingReady === 'boolean') || (typeof (window as any).__practicePendingProgress === 'number')) && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span data-testid="progress-count">{sessionProgress} / {TOTAL_TRIALS}</span>
          </div>
          <div data-testid="progress-bar" data-progress={sessionProgress}>
            <ProgressBar
              currentStep={sessionProgress}
              totalSteps={TOTAL_TRIALS}
              ariaDescribedBy="session-progress-status"
            />
          </div>
          <div id="session-progress-status" data-testid="session-progress-status" className="sr-only" aria-live="polite">
            {sessionProgressAnnouncement.message}
          </div>
        </div>
      )}

      <div className="panel col gap-8">
        <div className="flex gap-12 items-center wrap">
          <label>
            <span className="badge">Profile</span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as PresetKey)}
              className="select-input ml-2"
              aria-label="Target profile"
            >
              <option value="alto">Alto</option>
              <option value="mezzo">Mezzo</option>
              <option value="soprano">Soprano</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <span className="text-muted">{PRESETS[preset].note}</span>
        </div>

        {!ready && !err && <p className="badge">Allow microphone to begin.</p>}
        {err && <div role="alert" className="panel panel-danger">{err}</div>}
        {needsUnlock && (
          <div className="panel panel-danger" role="alert">
            <p>Tap "Enable audio" to begin analysis.</p>
            <button className="button" onClick={unlock}>Enable audio</button>
          </div>
        )}

        {ready && (
          <>
            <div>
              <strong>Mic level</strong>
              <Meter level={level} />
              <div className="flex gap-12 align-base mt-6">
                <span className="badge">Sample rate {audioCtx.current?.sampleRate ?? 0} Hz</span>
                {dbfs != null && <span className="badge">Level {Math.round(dbfs)} dBFS</span>}
              </div>
            </div>

            {/* Worklet Health */}
            <WorkletHealth intervalsRef={intervalsRef} />

            {/* Device Picker */}
            <DevicePicker
              value={inputDeviceId}
              onChange={setInputDeviceId}
              ec={echoCancellation} ns={noiseSuppression} agc={autoGainControl}
              onChangeConstraints={({ ec, ns, agc }) => {
                if (ec !== undefined) setEchoCancellation(ec);
                if (ns !== undefined) setNoiseSuppression(ns);
                if (agc !== undefined) setAutoGainControl(agc);
              }}
            />

            {/* Pitch */}
            <div className="col gap-6">
              <div className="flex items-center gap-6">
                <Orb
                  hueDeg={centroid != null ? Math.max(120, Math.min(280, 120 + (centroid - 1600) * 0.05)) : 180}
                  tiltDeg={pitch != null ? Math.max(-20, Math.min(20, (pitch - 220) * 0.2)) : 0}
                  size={80}
                  trends={[
                    { label: 'Pitch', value: pitch != null ? `${pitch} Hz` : '--' },
                    { label: 'Bright', value: centroid != null ? `${centroid} Hz` : '--' },
                  ]}
                  ariaLabel="Resonance indicator"
                />
                <div className="flex gap-12 align-base">
                  <span className="badge">Pitch (Hz)</span>
                  <strong className="text-2xl">{pitch ?? "-"}</strong>
                  {pitch && <span className="badge">{hzToNote(pitch)}</span>}
                  {pitch && <span className="badge" aria-live="polite">{inPitch ? "In range ✓" : "Adjust..."}</span>}
                  <span className="badge" title="Autocorrelation clarity">clarity {Math.round(clarity * 100)}</span>
                </div>
              </div>
              <TargetBar value={pitch} min={120} max={320} tmin={pitchTarget.min} tmax={pitchTarget.max} />
              <div className="col gap-4">
                <Slider label="Min pitch" min={120} max={250} value={pitchTarget.min}
                  onChange={(v) => onCustom(setPitchTarget, { ...pitchTarget, min: v })} />
                <Slider label="Max pitch" min={170} max={340} value={pitchTarget.max}
                  onChange={(v) => onCustom(setPitchTarget, { ...pitchTarget, max: v })} />
              </div>
            </div>

            {/* Brightness */}
            <div className="col gap-6">
              <div className="flex gap-12 align-base">
                <span className="badge">Brightness (centroid Hz)</span>
                <strong className="text-2xl">{centroid ?? "-"}</strong>
                {centroid && <span className="badge" aria-live="polite">{inBright ? "In range ✓" : "Add/soften"}</span>}
                {h1h2 != null && <span className="badge" title="H1-H2 dB (lower = brighter)">H1-H2 {h1h2.toFixed(1)} dB</span>}
              </div>
              <TargetBar value={centroid} min={800} max={4000} tmin={brightTarget.min} tmax={brightTarget.max} />
              <div className="col gap-4">
                <Slider label="Min brightness" min={1000} max={2800} value={brightTarget.min}
                  onChange={(v) => onCustom(setBrightTarget, { ...brightTarget, min: v })} />
                <Slider label="Max brightness" min={1800} max={3800} value={brightTarget.max}
                  onChange={(v) => onCustom(setBrightTarget, { ...brightTarget, max: v })} />
              </div>
            </div>

            {/* Coach */}
            <div className="panel panel--dashed" aria-live="polite">
              <strong>Coach</strong>
              <p className="m-0">{tip}</p>
            </div>

            {/* Guided trials */}
            <Trials
              getSnapshot={() => ({
                pitch,
                centroid,
                inPitch,
                inBright
              })}
              targets={{ pitch: pitchTarget, bright: brightTarget }}
              onComplete={onTrialComplete}
            />

            {/* Export button */}
            <ExportButton />

            {/* Session Summary */}
            <SessionSummary />
          </>
        )}
      </div>
    </section>
  );
}

function Slider({ label, min, max, value, onChange }:
  { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="col gap-6">
      <span className="sr-only">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <div className="text-muted text-sm">{label}: <strong>{value}</strong> Hz</div>
    </label>
  );
}

function useCoachTip({ pitch, centroid, h1h2, inPitch, inBright }:
  { pitch: number | null, centroid: number | null, h1h2: number | null, inPitch: boolean, inBright: boolean }) {
  // Simple rule engine - one hint at a time
  if (pitch == null || centroid == null) return "Say 'mee-mee-mee' for one second. Keep your volume steady.";
  if (!inPitch && pitch < 160) return "Try a slightly higher pitch. Imagine speaking on a gentle question.";
  if (!inPitch && pitch > 280) return "Relax the pitch down a touch. Aim for a comfortable speaking note.";
  if (inPitch && !inBright) {
    if (centroid < 1700) return "Add a little brightness: smile slightly and raise the tongue near the alveolar ridge.";
    if (centroid > 3300) return "Soften brightness: relax lip spread and reduce air pressure.";
  }
  if (h1h2 != null && h1h2 > 12) return "Reduce breathiness: firmer onset ('uh') then speak.";
  if (h1h2 != null && h1h2 < 2 && centroid < 1800) return "Bring some warmth back: lighten laryngeal tension.";
  return "Nice! Try a short phrase and keep it steady.";
}

function smooth(prev: number | null, next: number | null) {
  if (next == null) return null;
  if (prev == null) return next;
  return Math.round(prev * 0.7 + next * 0.3);
}
