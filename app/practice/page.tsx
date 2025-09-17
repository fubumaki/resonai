"use client";

import { useEffect, useRef, useState, useMemo, useReducer, useCallback } from "react";
// Side-effect import to ensure session progress helpers attach to window early
import '@/src/sessionProgress';
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
import {
  createPitchSabRingBuffer,
  drainPitchSab,
  markPitchSabReady,
  resetPitchSab,
  type PitchSabFrame,
  type PitchSabRingBuffer,
  SAB_RING_BUFFER_PATH,
} from '@/audio/sabRingBuffer';
import Script from 'next/script';
import {
  trackSessionProgress,
  createSessionProgressState,
  sessionProgressAnnouncementReducer,
  SESSION_PROGRESS_RESET_EVENT,
  type SessionProgressResetDetail,
  resetSessionProgressEvents,
  getSessionProgressEvents,
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

type PracticeProgressOptions = {
  totalSteps?: number;
  announcementPrefix?: string;
};

type PracticeHooksState = {
  ready?: boolean;
  progress?: number;
  totalSteps?: number;
  announcementPrefix?: string;
  defaultSetReady?: (value: boolean) => void;
  defaultSetProgress?: (value: number, options?: PracticeProgressOptions) => void;
};

declare global {
  interface Window {
    __setPracticeReady?: (value: boolean) => void;
    __setPracticeProgress?: (
      value: number,
      options?: PracticeProgressOptions
    ) => void;
    __getPracticeHooksState?: () => PracticeHooksState;
    __sabTelemetry?: {
      sab_available: boolean;
      sab_ready: boolean;
      sab_ring_buffer_path: string | null;
    };
  }
}

function sanitizeTotalSteps(totalSteps: number | undefined, fallback: number): number {
  const total = Number(totalSteps ?? fallback);
  if (!Number.isFinite(total) || total <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(total));
}

function clampCompletedSteps(value: number | undefined, totalSteps: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const rounded = Math.round(numeric);
  return Math.min(Math.max(rounded, 0), totalSteps);
}

function getPracticeHooksState(): PracticeHooksState | undefined {
  if (typeof window === 'undefined') return undefined;
  const globalWindow = window as typeof window & {
    __getPracticeHooksState?: () => PracticeHooksState;
    __practiceHooksState?: PracticeHooksState;
  };
  if (typeof globalWindow.__getPracticeHooksState === 'function') {
    return globalWindow.__getPracticeHooksState();
  }
  if (!globalWindow.__practiceHooksState) {
    globalWindow.__practiceHooksState = {};
  }
  return globalWindow.__practiceHooksState;
}

function readInitialPracticeReady(): boolean {
  const state = getPracticeHooksState();
  return typeof state?.ready === 'boolean' ? state.ready : false;
}

function readInitialPracticeProgress(defaultTotalSteps: number): number {
  const state = getPracticeHooksState();
  if (!state) return 0;
  const totalSteps = sanitizeTotalSteps(state.totalSteps, defaultTotalSteps);
  return clampCompletedSteps(state.progress, totalSteps);
}

function updatePracticeHooksReady(value: boolean): void {
  const state = getPracticeHooksState();
  if (!state) return;
  state.ready = value;
}

function updatePracticeHooksProgress(
  value: number,
  totalSteps: number,
  announcementPrefix?: string
): void {
  const state = getPracticeHooksState();
  if (!state) return;
  const safeTotal = sanitizeTotalSteps(totalSteps, TOTAL_TRIALS);
  state.totalSteps = safeTotal;
  state.progress = clampCompletedSteps(value, safeTotal);
  state.announcementPrefix = announcementPrefix;
}

function hasCachedPracticeHooksState(): boolean {
  const state = getPracticeHooksState();
  if (!state) return false;
  return typeof state.ready === 'boolean' || typeof state.progress === 'number';
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

  const [ready, setReady] = useState<boolean>(() => readInitialPracticeReady());
  const [err, setErr] = useState<string | null>(null);

  const [level, setLevel] = useState(0);
  const [dbfs, setDbfs] = useState<number | null>(null);
  const [pitch, setPitch] = useState<number | null>(null);
  const [centroid, setCentroid] = useState<number | null>(null);
  const [h1h2, setH1H2] = useState<number | null>(null);
  const [clarity, setClarity] = useState(0);
  const [lowPower, setLowPower] = useState(false);
  const [sessionProgress, setSessionProgress] = useState<number>(() => readInitialPracticeProgress(TOTAL_TRIALS));
  const [sessionProgressAnnouncement, dispatchSessionProgressAnnouncement] = useReducer(
    sessionProgressAnnouncementReducer,
    createSessionProgressState(TOTAL_TRIALS)
  );

  // Audio device settings
  const [inputDeviceId, setInputDeviceId] = useState<string | null>(null);
  const [echoCancellation, setEchoCancellation] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(false);
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
  const sabBufferRef = useRef<PitchSabRingBuffer | null>(null);
  const sabReaderRef = useRef<number | null>(null);
  const sabReadyRef = useRef(false);
  const sabDrainLastRef = useRef<number | null>(null);

  // Worklet health tracking
  const intervalsRef = useRef<number[]>([]);
  const lastMsgRef = useRef<number>(performance.now());

  const updateSabTelemetry = useCallback((update: Partial<{ sab_available: boolean; sab_ready: boolean; sab_ring_buffer_path: string | null }>) => {
    if (typeof window === 'undefined') return;
    const win = window as typeof window & {
      __sabTelemetry?: {
        sab_available: boolean;
        sab_ready: boolean;
        sab_ring_buffer_path: string | null;
      };
    };
    const base = win.__sabTelemetry ?? {
      sab_available: false,
      sab_ready: false,
      sab_ring_buffer_path: null as string | null,
    };
    win.__sabTelemetry = { ...base, ...update };
  }, []);

  const stopSabReader = useCallback(() => {
    if (sabReaderRef.current != null) {
      cancelAnimationFrame(sabReaderRef.current);
      sabReaderRef.current = null;
    }
    sabDrainLastRef.current = null;
    sabReadyRef.current = false;
  }, []);

  const applyAnalysisResult = useCallback((result: PitchSabFrame, eventTime?: number) => {
    const now = typeof eventTime === 'number' ? eventTime : performance.now();
    const nextPitch = result.pitch != null ? Math.round(result.pitch) : null;
    setPitch((prev) => smooth(prev, nextPitch));
    setCentroid(result.centroidHz != null ? Math.round(result.centroidHz) : null);
    setH1H2(result.h1h2 ?? null);
    setClarity(result.clarity ?? 0);

    const delta = now - lastMsgRef.current;
    if (Number.isFinite(delta) && delta >= 0) {
      intervalsRef.current.push(delta);
      if (intervalsRef.current.length > 200) intervalsRef.current.shift();
    }
    lastMsgRef.current = now;
  }, []);

  const startSabReader = useCallback(() => {
    if (!sabBufferRef.current) return;
    if (sabReaderRef.current != null) {
      cancelAnimationFrame(sabReaderRef.current);
    }

    const tick = () => {
      const buffer = sabBufferRef.current;
      if (!buffer) return;
      const frames = drainPitchSab(buffer);
      if (frames.length > 0) {
        const now = performance.now();
        const last = sabDrainLastRef.current;
        if (last == null) {
          for (const frame of frames) applyAnalysisResult(frame, now);
        } else {
          const totalDelta = now - last;
          const step = frames.length > 0 ? totalDelta / frames.length : 0;
          for (let i = 0; i < frames.length; i++) {
            const frameTime = step > 0 ? last + step * (i + 1) : now;
            applyAnalysisResult(frames[i], frameTime);
          }
        }
        sabDrainLastRef.current = now;
      }
      sabReaderRef.current = requestAnimationFrame(tick);
    };

    sabDrainLastRef.current = performance.now();
    sabReaderRef.current = requestAnimationFrame(tick);
  }, [applyAnalysisResult]);

  const normalizeWorkletMessage = (data: unknown): PitchSabFrame => {
    if (typeof data !== 'object' || data == null) {
      return { pitch: null, clarity: 0, rms: 0, centroidHz: null, rolloffHz: null, h1h2: null };
    }
    const obj = data as Record<string, unknown>;
    const maybeNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);
    const numberOrZero = (value: unknown): number => (typeof value === 'number' ? value : 0);
    return {
      pitch: maybeNumber(obj.pitch),
      clarity: numberOrZero(obj.clarity),
      rms: numberOrZero(obj.rms),
      centroidHz: maybeNumber(obj.centroidHz),
      rolloffHz: maybeNumber(obj.rolloffHz),
      h1h2: maybeNumber(obj.h1h2),
    };
  };

  const { needsUnlock, unlock } = useAudioUnlock(audioCtx);

  // Load saved settings on first load
  useEffect(() => {
    if (loading) return;
    setPreset(settings.preset);
    setPitchTarget({ min: settings.pitchMin, max: settings.pitchMax });
    setBrightTarget({ min: settings.brightMin, max: settings.brightMax });
    setLowPower(settings.lowPower ?? false);
    setInputDeviceId(settings.inputDeviceId ?? null);
    setEchoCancellation(settings.echoCancellation === true);
    setNoiseSuppression(settings.noiseSuppression === true);
    setAutoGainControl(settings.autoGainControl === true);
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
    stopSabReader();
    sabBufferRef.current = null;
    sabDrainLastRef.current = null;
    sabReadyRef.current = false;

    const sabSupported = typeof window !== 'undefined'
      && typeof SharedArrayBuffer !== 'undefined'
      && (window as typeof window & { crossOriginIsolated?: boolean }).crossOriginIsolated === true;

    updateSabTelemetry({
      sab_available: sabSupported,
      sab_ready: false,
      sab_ring_buffer_path: sabSupported ? SAB_RING_BUFFER_PATH : null,
    });

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

    if (!worklet.current) {
      await audioCtx.current.audioWorklet.addModule("/worklets/pitch.worklet.js");
      worklet.current = new AudioWorkletNode(audioCtx.current, "pitch-processor");
    }

    const node = worklet.current!;
    node.port.onmessage = ({ data }) => {
      if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'sab')) {
        const status = (data as { sab: unknown }).sab;
        if (status === 'ok') {
          if (sabBufferRef.current) {
            markPitchSabReady(sabBufferRef.current);
            sabReadyRef.current = true;
            sabDrainLastRef.current = performance.now();
            startSabReader();
            updateSabTelemetry({
              sab_available: sabSupported,
              sab_ready: true,
              sab_ring_buffer_path: sabSupported ? SAB_RING_BUFFER_PATH : null,
            });
          }
        } else if (status === 'error') {
          sabReadyRef.current = false;
          stopSabReader();
          sabBufferRef.current = null;
          updateSabTelemetry({ sab_ready: false });
        }
        return;
      }

      if (sabReadyRef.current && sabBufferRef.current) {
        return;
      }

      const frame = normalizeWorkletMessage(data);
      applyAnalysisResult(frame);
    };

    if (sabSupported) {
      const buffer = createPitchSabRingBuffer();
      sabBufferRef.current = buffer;
      resetPitchSab(buffer);
      node.port.postMessage({
        type: 'attach-sab',
        sab: buffer.sab,
        capacity: buffer.capacity,
        frameSize: buffer.valuesPerFrame,
      });
    }

    // mute to avoid feedback
    mute.current = audioCtx.current.createGain();
    mute.current.gain.value = 0;
    source.current.connect(node);
    node.connect(mute.current).connect(audioCtx.current.destination);
    node.port.postMessage({ minHz: 70, maxHz: 500, voicingRms: 0.012 });
  };

  useEffect(() => {
    (async () => {
      try {
        await startAudio();
        setReady(true);
        updatePracticeHooksReady(true);
      } catch (e: any) {
        setErr(e?.message ?? "Microphone permission denied.");
        updatePracticeHooksReady(false);
      }
    })();
    // Attach test helpers for Playwright deterministically
    if (typeof window !== 'undefined') {
      const globalAny = window as any;
      globalAny.__resetSessionProgress = () => resetSessionProgressEvents();
      globalAny.__getSessionProgress = () => getSessionProgressEvents();
      globalAny.__trackSessionProgress = (step: number, total: number) => trackSessionProgress(step, total);
    }
    return () => {
      mediaStream.current?.getTracks().forEach(t => t.stop());
      audioCtx.current?.close();
      stopSabReader();
      sabBufferRef.current = null;
      updateSabTelemetry({ sab_ready: false });
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

  const handleSessionProgressReset = useCallback((announcementPrefix?: string, totalSteps?: number) => {
    const safeTotal = sanitizeTotalSteps(totalSteps, TOTAL_TRIALS);
    setSessionProgress(0);
    updatePracticeHooksProgress(0, safeTotal, announcementPrefix);
    dispatchSessionProgressAnnouncement({
      type: 'reset',
      totalSteps: safeTotal,
      announcementPrefix,
    });
  }, [dispatchSessionProgressAnnouncement]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onSessionProgressReset: EventListener = (event) => {
      const detail = (event as CustomEvent<SessionProgressResetDetail>).detail;
      handleSessionProgressReset(detail?.announcementPrefix, detail?.totalSteps);
    };

    window.addEventListener(SESSION_PROGRESS_RESET_EVENT, onSessionProgressReset);
    return () => window.removeEventListener(SESSION_PROGRESS_RESET_EVENT, onSessionProgressReset);
  }, [handleSessionProgressReset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const state = getPracticeHooksState();
    if (!state) return;

    const previousReady = window.__setPracticeReady;
    const previousProgress = window.__setPracticeProgress;

    const applyReady = (value: boolean) => {
      const next = !!value;
      state.ready = next;
      setReady(next);
    };

    const applyProgress = (
      value: number,
      options?: PracticeProgressOptions
    ) => {
      const safeTotal = sanitizeTotalSteps(options?.totalSteps ?? state.totalSteps, TOTAL_TRIALS);
      const safeValue = clampCompletedSteps(value, safeTotal);
      state.totalSteps = safeTotal;
      state.progress = safeValue;
      state.announcementPrefix = options?.announcementPrefix;
      setSessionProgress(safeValue);
      dispatchSessionProgressAnnouncement({
        type: 'progress',
        completed: safeValue,
        totalSteps: safeTotal,
        announcementPrefix: options?.announcementPrefix,
      });
    };

    window.__setPracticeReady = applyReady;
    window.__setPracticeProgress = applyProgress;

    if (typeof state.ready === 'boolean') {
      applyReady(state.ready);
    }
    if (typeof state.progress === 'number') {
      applyProgress(state.progress, {
        totalSteps: state.totalSteps,
        announcementPrefix: state.announcementPrefix,
      });
    }

    return () => {
      if (previousReady && previousReady !== applyReady) {
        window.__setPracticeReady = previousReady;
      } else if (state.defaultSetReady) {
        window.__setPracticeReady = state.defaultSetReady;
      } else {
        delete window.__setPracticeReady;
      }

      if (previousProgress && previousProgress !== applyProgress) {
        window.__setPracticeProgress = previousProgress;
      } else if (state.defaultSetProgress) {
        window.__setPracticeProgress = state.defaultSetProgress;
      } else {
        delete window.__setPracticeProgress;
      }
    };
  }, [dispatchSessionProgressAnnouncement]);

  const rafLevel = () => {
    const data = new Uint8Array(analyser.current!.fftSize);
    let last = 0;
    const tick = () => {
      const now = performance.now();
      const interval = lowPower ? 100 : 16; // 10 fps vs ~60 fps
      if (now - last >= interval) {
        analyser.current!.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 2));

        // Calculate dBFS
        const db = 20 * Math.log10(rms + 1e-7);
        setDbfs(Math.max(-60, Math.min(-6, db)));
        last = now;
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
          updatePracticeHooksProgress(next, TOTAL_TRIALS);
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
    setLowPower(defaultSettings.lowPower ?? false);
    setInputDeviceId(defaultSettings.inputDeviceId ?? null);
    setEchoCancellation(defaultSettings.echoCancellation === true);
    setNoiseSuppression(defaultSettings.noiseSuppression === true);
    setAutoGainControl(defaultSettings.autoGainControl === true);
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
            <p>Tap &quot;Enable audio&quot; to begin analysis.</p>
            <button className="button" onClick={unlock}>Enable audio</button>
          </div>
        )}

        <div>
          <strong>Mic level</strong>
          <Meter level={level} />
          {ready && (
            <div className="flex gap-12 align-base mt-6">
              <span className="badge">Sample rate {audioCtx.current?.sampleRate ?? 0} Hz</span>
              {dbfs != null && <span className="badge">Level {Math.round(dbfs)} dBFS</span>}
            </div>
          )}
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
