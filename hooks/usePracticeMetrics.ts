import { useState, useEffect, useRef, useCallback } from 'react';
import { hudAnalytics } from '../lib/analytics/hud';

export interface PracticeMetrics {
  pitch: number | null; // Hz
  brightness: number; // 0-1 normalized
  confidence: number; // 0-1
  inRangePercentage: number; // 0-100
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
  historyLength?: number; // number of samples to keep for in-range calculation
}

const DEFAULT_TARGET_RANGES: TargetRanges = {
  pitchMin: 200, // ~G3
  pitchMax: 400, // ~G4
  brightnessMin: 0.3,
  brightnessMax: 0.7,
};

const DEFAULT_UPDATE_INTERVAL = 16.67; // 60fps
const DEFAULT_HISTORY_LENGTH = 600; // ~10 seconds at 60fps

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

  // Initialize audio processing
  const initializeAudioProcessing = useCallback(async () => {
    if (!mediaStream || audioContextRef.current) return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const sourceNode = audioContext.createMediaStreamSource(mediaStream);
      sourceNodeRef.current = sourceNode;

      // Load and create worklet processors
      await audioContext.audioWorklet.addModule('/worklets/pitch-processor.js');
      await audioContext.audioWorklet.addModule('/worklets/energy-processor.js');
      await audioContext.audioWorklet.addModule('/worklets/spectral-processor.js');

      // Create processor nodes
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
        if (f0Hz !== null && f0Hz !== undefined) {
          currentPitch = f0Hz;
          currentConfidence = f0Conf;
        }
      };

      spectralProcessor.port.onmessage = (event) => {
        const { brightness } = event.data;
        currentBrightness = brightness;
      };

      // Update metrics at target frame rate
      const updateMetrics = (timestamp: number) => {
        if (timestamp - lastUpdateRef.current >= updateInterval) {
          const newMetrics: PracticeMetrics = {
            pitch: currentPitch > 0 ? currentPitch : null,
            brightness: currentBrightness,
            confidence: currentConfidence,
            inRangePercentage: 0, // Will be calculated below
          };

          // Calculate in-range percentage
          metricsHistoryRef.current.push(newMetrics);
          if (metricsHistoryRef.current.length > historyLength) {
            metricsHistoryRef.current.shift();
          }

          const inRangeCount = metricsHistoryRef.current.filter(m => {
            const pitchInRange = m.pitch === null || 
              (m.pitch >= targetRanges.pitchMin && m.pitch <= targetRanges.pitchMax);
            const brightnessInRange = m.brightness >= targetRanges.brightnessMin && 
              m.brightness <= targetRanges.brightnessMax;
            return pitchInRange && brightnessInRange;
          }).length;

          newMetrics.inRangePercentage = metricsHistoryRef.current.length > 0 
            ? (inRangeCount / metricsHistoryRef.current.length) * 100 
            : 0;

          setMetrics(newMetrics);
          lastUpdateRef.current = timestamp;
        }

        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateMetrics);
        }
      };

      // Start the update loop
      setIsActive(true);
      animationFrameRef.current = requestAnimationFrame(updateMetrics);

    } catch (err) {
      console.error('Failed to initialize audio processing:', err);
      setError(err instanceof Error ? err.message : 'Audio processing initialization failed');
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
