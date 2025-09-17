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

type AudioConstraintOverrides = Partial<{
  inputDeviceId: string | null;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}>;

type PracticeAudioProbe = {
  audio_latency: {
    audio_context: {
      latencyHint: number | string | null;
    };
  };
  getLatencyHint: () => number | string | null;
};

declare global {
  interface Window {
    __setPracticeReady?: (value: boolean) => void;
    __setPracticeProgress?: (
      value: number,
      options?: PracticeProgressOptions
    ) => void;
    __getPracticeHooksState?: () => PracticeHooksState;
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
  const [contextVersion, setContextVersion] = useState(0);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const check = () => setNeedsUnlock(ctx.state === "suspended");
    check();
    const onState = () => check();
    ctx.addEventListener("statechange", onState);
    return () => ctx.removeEventListener("statechange", onState);
  }, [ctxRef, contextVersion]);

  const unlock = async () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    try { await ctx.resume(); } catch { }
  };

  const registerContext = () => {
    setContextVersion((value) => value + 1);
  };

  return { needsUnlock, unlock, registerContext };
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
  const autoRestartRef = useRef(true);

  // Worklet health tracking
  const intervalsRef = useRef<number[]>([]);
  const lastMsgRef = useRef<number>(performance.now());

  const { needsUnlock, unlock, registerContext } = useAudioUnlock(audioCtx);

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

  const showToast = useCallback((msg: string) => {
    if (typeof document === 'undefined') return;
    const host = document.getElementById('toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    host.appendChild(el);
    window.setTimeout(() => el.remove(), 1800);
  }, []);

  const ensurePracticeAudioProbe = useCallback((): PracticeAudioProbe | null => {
    if (typeof window === 'undefined') return null;
    const globalAny = window as typeof window & { __practiceAudioProbe?: PracticeAudioProbe };
    if (!globalAny.__practiceAudioProbe) {
      globalAny.__practiceAudioProbe = {
        audio_latency: { audio_context: { latencyHint: null } },
        getLatencyHint() {
          return this.audio_latency.audio_context.latencyHint;
        },
      };
    } else if (typeof globalAny.__practiceAudioProbe.getLatencyHint !== 'function') {
      globalAny.__practiceAudioProbe.getLatencyHint = function getLatencyHint() {
        return this.audio_latency.audio_context.latencyHint;
      };
    }
    return globalAny.__practiceAudioProbe;
  }, []);

  const notifyPracticeAudioLatency = useCallback((hint: number | string | null) => {
    if (typeof window === 'undefined') return;
    const globalAny = window as typeof window & {
      __practiceAudioLatencyDidChange?: (value: number | string | null) => void;
    };
    const handler = globalAny.__practiceAudioLatencyDidChange;
    if (typeof handler === 'function') {
      handler(hint);
    }
  }, []);

  const resetAudioPipeline = useCallback(async (overrides?: AudioConstraintOverrides) => {
    const hasInputOverride = overrides && Object.prototype.hasOwnProperty.call(overrides, 'inputDeviceId');
    const resolvedInputDeviceId = hasInputOverride ? overrides?.inputDeviceId ?? null : inputDeviceId;
    const hasEchoOverride = overrides && Object.prototype.hasOwnProperty.call(overrides, 'echoCancellation');
    const resolvedEchoCancellation =
      hasEchoOverride && typeof overrides?.echoCancellation === 'boolean'
        ? overrides.echoCancellation
        : echoCancellation;
    const hasNoiseOverride = overrides && Object.prototype.hasOwnProperty.call(overrides, 'noiseSuppression');
    const resolvedNoiseSuppression =
      hasNoiseOverride && typeof overrides?.noiseSuppression === 'boolean'
        ? overrides.noiseSuppression
        : noiseSuppression;
    const hasAgcOverride = overrides && Object.prototype.hasOwnProperty.call(overrides, 'autoGainControl');
    const resolvedAutoGainControl =
      hasAgcOverride && typeof overrides?.autoGainControl === 'boolean'
        ? overrides.autoGainControl
        : autoGainControl;

    setLevel(0);
    setDbfs(null);
    setPitch(null);
    setCentroid(null);
    setH1H2(null);
    setClarity(0);

    const stopTracks = (stream: MediaStream | null | undefined) => {
      if (!stream) return;
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          /* noop */
        }
      });
    };

    stopTracks(mediaStream.current);
    mediaStream.current = null;

    analyser.current?.disconnect();
    analyser.current = null;
    source.current?.disconnect();
    source.current = null;
    if (worklet.current) {
      try { worklet.current.port.onmessage = null as any; } catch { /* noop */ }
      worklet.current.disconnect();
      worklet.current = null;
    }
    mute.current?.disconnect();
    mute.current = null;

    const prevCtx = audioCtx.current;
    audioCtx.current = null;
    if (prevCtx) {
      try { await prevCtx.close(); } catch { /* noop */ }
    }

    if (typeof window === 'undefined') {
      throw new Error('AudioContext unavailable.');
    }

    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) {
      throw new Error('AudioContext unsupported.');
    }

    const requestedLatencyHint: number | string = 0;
    let ctx: AudioContext;
    let reportedLatencyHint: number | string | null = requestedLatencyHint;
    try {
      ctx = new AudioCtor({ latencyHint: requestedLatencyHint } as AudioContextOptions);
      const actualHint = (ctx as any).latencyHint;
      if (typeof actualHint === 'number' || typeof actualHint === 'string') {
        reportedLatencyHint = actualHint;
      }
    } catch {
      ctx = new AudioCtor();
      const actualHint = (ctx as any).latencyHint;
      reportedLatencyHint =
        typeof actualHint === 'number' || typeof actualHint === 'string'
          ? actualHint
          : null;
    }

    const closeNewContext = async () => {
      try { await ctx.close(); } catch { /* noop */ }
    };

    const probe = ensurePracticeAudioProbe();
    if (probe) {
      probe.audio_latency.audio_context.latencyHint = reportedLatencyHint;
    }
    notifyPracticeAudioLatency(reportedLatencyHint);

    const devices = navigator.mediaDevices;
    if (!devices?.getUserMedia) {
      await closeNewContext();
      throw new Error('Microphone access unavailable.');
    }

    const buildConstraints = (forceDefault = false): MediaStreamConstraints => ({
      audio: {
        deviceId: !forceDefault && resolvedInputDeviceId ? { exact: resolvedInputDeviceId } : undefined,
        echoCancellation: resolvedEchoCancellation,
        noiseSuppression: resolvedNoiseSuppression,
        autoGainControl: resolvedAutoGainControl,
      }
    });

    let stream: MediaStream | null = null;
    try {
      stream = await devices.getUserMedia(buildConstraints(false));
    } catch (primaryError) {
      try {
        stream = await devices.getUserMedia(buildConstraints(true));
        showToast('Selected mic unavailable - using system default.');
      } catch (fallbackError) {
        await closeNewContext();
        throw fallbackError;
      }
    }

    if (!stream) {
      await closeNewContext();
      throw new Error('Microphone permission denied.');
    }

    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let analyserNode: AnalyserNode | null = null;
    let workletNode: AudioWorkletNode | null = null;
    let muteNode: GainNode | null = null;

    try {
      sourceNode = ctx.createMediaStreamSource(stream);
      analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 2048;
      sourceNode.connect(analyserNode);

      await ctx.audioWorklet.addModule('/worklets/pitch.worklet.js');
      workletNode = new AudioWorkletNode(ctx, 'pitch-processor');
      workletNode.port.onmessage = ({ data }) => {
        const p = data.pitch ? Math.round(data.pitch) : null;
        setPitch((prev) => smooth(prev, p));
        setCentroid(data.centroidHz ? Math.round(data.centroidHz) : null);
        setH1H2(data.h1h2 ?? null);
        setClarity(data.clarity ?? 0);

        const now = performance.now();
        intervalsRef.current.push(now - lastMsgRef.current);
        lastMsgRef.current = now;
        if (intervalsRef.current.length > 200) intervalsRef.current.shift();
      };

      intervalsRef.current = [];
      lastMsgRef.current = performance.now();

      muteNode = ctx.createGain();
      muteNode.gain.value = 0;

      sourceNode.connect(workletNode);
      workletNode.connect(muteNode).connect(ctx.destination);
      workletNode.port.postMessage({ minHz: 70, maxHz: 500, voicingRms: 0.012 });
    } catch (error) {
      stopTracks(stream);
      analyserNode?.disconnect();
      sourceNode?.disconnect();
      if (workletNode) {
        try { workletNode.port.onmessage = null as any; } catch { /* noop */ }
        workletNode.disconnect();
      }
      muteNode?.disconnect();
      await closeNewContext();
      throw error;
    }

    mediaStream.current = stream;
    source.current = sourceNode;
    analyser.current = analyserNode;
    worklet.current = workletNode;
    mute.current = muteNode;

    audioCtx.current = ctx;
    registerContext();
  }, [
    inputDeviceId,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    showToast,
    registerContext,
    ensurePracticeAudioProbe,
    notifyPracticeAudioLatency,
  ]);

  const handleAudioError = useCallback((error: unknown) => {
    const message =
      error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
        ? (error as any).message as string
        : 'Microphone permission denied.';
    setErr(message);
    setReady(false);
    updatePracticeHooksReady(false);
  }, []);

  const restartAudio = useCallback(async (overrides?: AudioConstraintOverrides) => {
    try {
      await resetAudioPipeline(overrides);
      setErr(null);
      setReady(true);
      updatePracticeHooksReady(true);
      return true;
    } catch (error) {
      handleAudioError(error);
      return false;
    }
  }, [resetAudioPipeline, handleAudioError]);

  useEffect(() => {
    ensurePracticeAudioProbe();
  }, [ensurePracticeAudioProbe]);

  useEffect(() => {
    (async () => {
      await restartAudio();
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
      analyser.current?.disconnect();
      analyser.current = null;
      source.current?.disconnect();
      source.current = null;
      if (worklet.current) {
        try { worklet.current.port.onmessage = null as any; } catch { /* noop */ }
        worklet.current.disconnect();
      }
      worklet.current = null;
      mute.current?.disconnect();
      mute.current = null;
      const ctx = audioCtx.current;
      audioCtx.current = null;
      ctx?.close().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart audio when device/constraints change
  useEffect(() => {
    if (!ready || !autoRestartRef.current) return;
    (async () => {
      await restartAudio();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputDeviceId, echoCancellation, noiseSuppression, autoGainControl, ready]);

  // Handle device hot-plug
  useEffect(() => {
    const onChange = () => {
      if (!autoRestartRef.current) return;
      restartAudio().catch(() => undefined);
    };
    navigator.mediaDevices.addEventListener?.('devicechange', onChange);
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', onChange);
  }, [restartAudio]);

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

  // Reset handlers
  const resetToPresetDefaults = () => {
    // Use the currently selected preset's defaults
    const p = PRESETS[preset];
    setPitchTarget({ ...p.pitch });
    setBrightTarget({ ...p.bright });
    handleSessionProgressReset('Practice data reset.');
    showToast('Practice data reset');
  };

  const resetAll = async () => {
    autoRestartRef.current = false;

    const nextPreset = defaultSettings.preset;
    const nextPitchTarget = { min: defaultSettings.pitchMin, max: defaultSettings.pitchMax };
    const nextBrightTarget = { min: defaultSettings.brightMin, max: defaultSettings.brightMax };
    const nextLowPower = defaultSettings.lowPower ?? false;
    const nextInputDeviceId = defaultSettings.inputDeviceId ?? null;
    const nextEchoCancellation = defaultSettings.echoCancellation === true;
    const nextNoiseSuppression = defaultSettings.noiseSuppression === true;
    const nextAutoGainControl = defaultSettings.autoGainControl === true;

    // Settings → defaults
    setPreset(nextPreset);
    setPitchTarget(nextPitchTarget);
    setBrightTarget(nextBrightTarget);
    setLowPower(nextLowPower);
    setInputDeviceId(nextInputDeviceId);
    setEchoCancellation(nextEchoCancellation);
    setNoiseSuppression(nextNoiseSuppression);
    setAutoGainControl(nextAutoGainControl);

    try { await (db as any).trials.clear(); } catch { }
    handleSessionProgressReset('Practice data reset.');

    try {
      await restartAudio({
        inputDeviceId: nextInputDeviceId,
        echoCancellation: nextEchoCancellation,
        noiseSuppression: nextNoiseSuppression,
        autoGainControl: nextAutoGainControl,
      });
    } finally {
      autoRestartRef.current = true;
    }

    showToast('Practice data reset');
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
        <ExportButton onResetAudioPipeline={restartAudio} />

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
