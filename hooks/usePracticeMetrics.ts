import { useState, useEffect, useRef, useCallback } from 'react';
import { hudAnalytics } from '../lib/analytics/hud';

export interface PracticeMetrics {
  pitch: number | null; // Hz
  brightness: number; // 0-1 normalized
  confidence: number; // 0-1
  inRangePercentage: number; // 0-100 legacy support
  timeInTargetPct: number; // 0-1 contract field
  voicedTimePct: number; // 0-1 voiced ratio
  jitterEma: number; // semitone delta EMA
  smoothness: number; // 0-1 derived from jitter
  expressiveness: number; // 0-1 variance heuristic
  endRiseDetected: boolean;
}

export interface TargetRanges {
  pitchMin: number; // Hz
  pitchMax: number; // Hz
  brightnessMin: number; // 0-1
  brightnessMax: number; // 0-1
}

interface UsePracticeMetricsOptions {
  targetRanges?: TargetRanges;
  updateInterval?: number; // ms, default 16.67 for 60fps
  historyLength?: number; // number of samples to keep for rolling metrics
}

const DEFAULT_TARGET_RANGES: TargetRanges = {
  pitchMin: 200, // ~G3
  pitchMax: 400, // ~G4
  brightnessMin: 0.3,
  brightnessMax: 0.7,
};

const DEFAULT_UPDATE_INTERVAL = 16.67; // 60fps
const DEFAULT_HISTORY_LENGTH = 600; // ~10 seconds at 60fps
const JITTER_ALPHA = 0.1;
const VOICED_CONFIDENCE_GATE = 0.3;
const EXPRESSIVENESS_NORMALIZER = 4; // semitone standard deviation
const END_RISE_THRESHOLD = 0.75; // semitone lift heuristic

export function usePracticeMetrics(
  mediaStream: MediaStream | null,
  options: UsePracticeMetricsOptions = {}
) {
  const {
    targetRanges = DEFAULT_TARGET_RANGES,
    updateInterval = DEFAULT_UPDATE_INTERVAL,
    historyLength = DEFAULT_HISTORY_LENGTH,
  } = options;

  const [metrics, setMetrics] = useState<PracticeMetrics>({
    pitch: null,
    brightness: 0,
    confidence: 0,
    inRangePercentage: 0,
    timeInTargetPct: 0,
    voicedTimePct: 0,
    jitterEma: 0,
    smoothness: 0,
    expressiveness: 0,
    endRiseDetected: false,
  });

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pitchProcessorRef = useRef<AudioWorkletNode | null>(null);
  const energyProcessorRef = useRef<AudioWorkletNode | null>(null);
  const spectralProcessorRef = useRef<AudioWorkletNode | null>(null);

  // Refs for metrics tracking
  const metricsHistoryRef = useRef<PracticeMetrics[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const baselinePitchRef = useRef<number | null>(null);
  const lastPitchRef = useRef<number | null>(null);
  const jitterEmaRef = useRef<number>(0);
  const semitoneHistoryRef = useRef<number[]>([]);
  const expressivenessRef = useRef<number>(0);
  const thresholdsSentRef = useRef(false);
  const hudVisibleRef = useRef(false);

  const average = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  // Initialize audio processing
  const initializeAudioProcessing = useCallback(async () => {
    if (!mediaStream || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext({ latencyHint: 0 });
      audioContextRef.current = audioContext;

      if (!thresholdsSentRef.current) {
        hudAnalytics.metricsThresholds({
          pitchMin: targetRanges.pitchMin,
          pitchMax: targetRanges.pitchMax,
          brightnessMin: targetRanges.brightnessMin,
          brightnessMax: targetRanges.brightnessMax,
        });
        thresholdsSentRef.current = true;
      }

      const sourceNode = audioContext.createMediaStreamSource(mediaStream);
      sourceNodeRef.current = sourceNode;

      // Load and create worklet processors
      await audioContext.audioWorklet.addModule('/worklets/pitch-processor.js');
      await audioContext.audioWorklet.addModule('/worklets/energy-processor.js');
      await audioContext.audioWorklet.addModule('/worklets/spectral-processor.js');

      const pitchProcessor = new AudioWorkletNode(audioContext, 'pitch-processor');
      const energyProcessor = new AudioWorkletNode(audioContext, 'energy-processor');
      const spectralProcessor = new AudioWorkletNode(audioContext, 'spectral-processor');

      pitchProcessorRef.current = pitchProcessor;
      energyProcessorRef.current = energyProcessor;
      spectralProcessorRef.current = spectralProcessor;

      // Connect audio graph
      sourceNode.connect(pitchProcessor);
      sourceNode.connect(energyProcessor);
      sourceNode.connect(spectralProcessor);

      // Set up message handlers
      let currentPitch = 0;
      let currentConfidence = 0;
      let currentBrightness = 0;

      pitchProcessor.port.onmessage = (event) => {
        const { f0Hz, f0Conf } = event.data;
        if (typeof f0Hz === 'number' && f0Hz > 0) {
          currentPitch = f0Hz;
          currentConfidence = typeof f0Conf === 'number' ? f0Conf : currentConfidence;
        } else {
          currentPitch = 0;
          currentConfidence = typeof f0Conf === 'number' ? f0Conf : currentConfidence;
        }
      };

      spectralProcessor.port.onmessage = (event) => {
        const { brightness } = event.data;
        if (typeof brightness === 'number') {
          currentBrightness = Math.max(0, Math.min(1, brightness));
        }
      };

      const updateMetrics = (timestamp: number) => {
        if (timestamp - lastUpdateRef.current >= updateInterval) {
          const pitchValue = currentPitch > 0 ? currentPitch : null;
          const base: PracticeMetrics = {
            pitch: pitchValue,
            brightness: currentBrightness,
            confidence: currentConfidence,
            inRangePercentage: 0,
            timeInTargetPct: 0,
            voicedTimePct: 0,
            jitterEma: jitterEmaRef.current,
            smoothness: Math.max(0, Math.min(1, 1 - Math.min(jitterEmaRef.current / 0.5, 1))),
            expressiveness: expressivenessRef.current,
            endRiseDetected: false,
          };

          const isVoiced = pitchValue !== null && currentConfidence >= VOICED_CONFIDENCE_GATE;
          if (isVoiced && pitchValue !== null) {
            if (baselinePitchRef.current == null) {
              baselinePitchRef.current = pitchValue;
            } else {
              baselinePitchRef.current = (baselinePitchRef.current * 0.995) + (pitchValue * 0.005);
            }

            const baseline = baselinePitchRef.current ?? pitchValue;
            const currentSemi = 12 * Math.log2(pitchValue / Math.max(baseline, 1e-6));

            if (lastPitchRef.current !== null) {
              const prevSemi = 12 * Math.log2(lastPitchRef.current / Math.max(baseline, 1e-6));
              const delta = Math.abs(currentSemi - prevSemi);
              jitterEmaRef.current = (1 - JITTER_ALPHA) * jitterEmaRef.current + JITTER_ALPHA * delta;
            }
            lastPitchRef.current = pitchValue;

            semitoneHistoryRef.current.push(currentSemi);
            if (semitoneHistoryRef.current.length > historyLength) {
              semitoneHistoryRef.current.shift();
            }
          } else {
            lastPitchRef.current = null;
            jitterEmaRef.current *= 0.95; // decay when signal absent
          }

          base.jitterEma = jitterEmaRef.current;
          base.smoothness = Math.max(0, Math.min(1, 1 - Math.min(jitterEmaRef.current / 0.5, 1)));

          if (semitoneHistoryRef.current.length > 4) {
            const mean = average(semitoneHistoryRef.current);
            const variance = semitoneHistoryRef.current.reduce((sum, value) => {
              return sum + Math.pow(value - mean, 2);
            }, 0) / semitoneHistoryRef.current.length;
            const std = Math.sqrt(Math.max(variance, 0));
            const expressiveness = Math.max(0, Math.min(1, std / EXPRESSIVENESS_NORMALIZER));
            expressivenessRef.current = expressiveness;
            base.expressiveness = expressiveness;
          } else {
            expressivenessRef.current *= 0.9;
            base.expressiveness = expressivenessRef.current;
          }

          const recentSemitones = semitoneHistoryRef.current.slice(-Math.max(9, Math.floor(historyLength / 6)));
          if (recentSemitones.length >= 6) {
            const segment = Math.max(1, Math.floor(recentSemitones.length / 3));
            const startSlice = recentSemitones.slice(0, segment);
            const endSlice = recentSemitones.slice(-segment);
            const startAvg = average(startSlice);
            const endAvg = average(endSlice);
            base.endRiseDetected = (endAvg - startAvg) >= END_RISE_THRESHOLD;
          } else {
            base.endRiseDetected = false;
          }

          metricsHistoryRef.current.push(base);
          if (metricsHistoryRef.current.length > historyLength) {
            metricsHistoryRef.current.shift();
          }

          const totalSamples = metricsHistoryRef.current.length;
          const inRangeCount = metricsHistoryRef.current.filter(m => {
            if (m.pitch == null) return false;
            const pitchInRange = m.pitch >= targetRanges.pitchMin && m.pitch <= targetRanges.pitchMax;
            const brightnessInRange = m.brightness >= targetRanges.brightnessMin && m.brightness <= targetRanges.brightnessMax;
            return pitchInRange && brightnessInRange;
          }).length;

          const voicedCount = metricsHistoryRef.current.filter(m => (
            m.pitch != null && m.confidence >= VOICED_CONFIDENCE_GATE
          )).length;

          const timeInTargetPct = totalSamples > 0 ? inRangeCount / totalSamples : 0;
          const voicedTimePct = totalSamples > 0 ? voicedCount / totalSamples : 0;

          base.inRangePercentage = timeInTargetPct * 100;
          base.timeInTargetPct = timeInTargetPct;
          base.voicedTimePct = voicedTimePct;

          setMetrics(base);
          lastUpdateRef.current = timestamp;
        }

        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateMetrics);
        }
      };

      setIsActive(true);
      hudAnalytics.hudShown('recording_started');
      hudVisibleRef.current = true;
      animationFrameRef.current = requestAnimationFrame(updateMetrics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Audio processing initialization failed';
      setError(message);
      hudAnalytics.audioProcessingError(message);
    }
  }, [mediaStream, targetRanges, updateInterval, historyLength, isActive]);

  // Cleanup audio processing
  const cleanup = useCallback(() => {
    setIsActive(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (pitchProcessorRef.current) {
      pitchProcessorRef.current.disconnect();
      pitchProcessorRef.current = null;
    }

    if (energyProcessorRef.current) {
      energyProcessorRef.current.disconnect();
      energyProcessorRef.current = null;
    }

    if (spectralProcessorRef.current) {
      spectralProcessorRef.current.disconnect();
      spectralProcessorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    metricsHistoryRef.current = [];
    baselinePitchRef.current = null;
    lastPitchRef.current = null;
    jitterEmaRef.current = 0;
    semitoneHistoryRef.current = [];
    expressivenessRef.current = 0;

    if (hudVisibleRef.current) {
      hudAnalytics.hudHidden('recording_stopped');
      hudVisibleRef.current = false;
    }
  }, []);

  // Start/stop processing
  const start = useCallback(() => {
    if (mediaStream && !isActive) {
      initializeAudioProcessing();
    }
  }, [mediaStream, isActive, initializeAudioProcessing]);

  const stop = useCallback(() => {
    cleanup();
    setMetrics({
      pitch: null,
      brightness: 0,
      confidence: 0,
      inRangePercentage: 0,
      timeInTargetPct: 0,
      voicedTimePct: 0,
      jitterEma: 0,
      smoothness: 0,
      expressiveness: 0,
      endRiseDetected: false,
    });
  }, [cleanup]);

  // Initialize when mediaStream changes
  useEffect(() => {
    if (mediaStream) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [mediaStream, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    metrics,
    isActive,
    error,
    start,
    stop,
  };
}
