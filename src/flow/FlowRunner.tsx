'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FlowJson, FlowStepBase, InfoStep, DrillStep, ReflectionStep } from './types';
import { PitchEngine } from '@/audio/PitchEngine';
import { createCrepeDetector } from '@/audio/detectors/CrepeTinyDetector';
import YinDetector from '@/audio/detectors/YinDetector';
// import { dtwAvgSemitoneDiff, tierFromAvgDiff } from '@/audio/intonation/dtw';
import { endRiseDetected } from '@/audio/intonation/endRise';
import { updateSafety, resetSafety } from '@/audio/safety';
import DiagnosticsHUD from '@/components/DiagnosticsHUD';
import { deviceManager } from '@/audio/deviceManager';

interface DrillMetrics {
  timeInTargetPct?: number;
  jitterEma?: number;
  endRiseDetected?: boolean;
  prosodyVar?: number;
  voicedTimePct?: number;
}

interface SessionSummary {
  flowName: string;
  startTime: number;
  endTime: number;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    metrics: DrillMetrics;
  }>;
}

export function FlowRunner({ flowJson }: { flowJson: FlowJson }) {
  const [currentStep, setCurrentStep] = useState<FlowStepBase | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [drillMetrics, setDrillMetrics] = useState<DrillMetrics>({});
  const [showCooldown, setShowCooldown] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [showDeviceChangeToast, setShowDeviceChangeToast] = useState(false);

  const engineRef = useRef<PitchEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const drillDataRef = useRef<Array<{ semitones: number; time: number; loudness: number }>>([]);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Start with first step
    if (flowJson.steps.length > 0) {
      setCurrentStep(flowJson.steps[0]);
    }
  }, [flowJson]);

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    resetSafety();
    
    // Process drill results
    if (currentStep?.type === 'drill') {
      processDrillResults(currentStep as DrillStep);
    }
  }, [currentStep]);

  useEffect(() => {
    initializeEngine();
    
    // Set up device change detection
    const unsubscribe = deviceManager.onDeviceChange(() => {
      if (isRecording) {
        setShowDeviceChangeToast(true);
        stopRecording();
      }
    });
    
    return () => {
      cleanup();
      unsubscribe();
    };
  }, [isRecording, stopRecording]); // Include dependencies

  const initializeEngine = async () => {
    try {
      // Check for cross-origin isolation and SharedArrayBuffer support
      const useCrepe = typeof window !== 'undefined' && 
                       typeof SharedArrayBuffer !== 'undefined' && 
                       window.crossOriginIsolated;
      
      let detector;
      if (useCrepe) {
        try {
          detector = await createCrepeDetector({
            modelUrl: '/models/crepe-tiny.onnx',
            threads: 4,
            simd: true,
          });
        } catch (error) {
          console.warn('CREPE detector failed, falling back to YIN:', error);
          detector = new YinDetector();
        }
      } else {
        detector = new YinDetector();
      }
      
      const engine = new PitchEngine(detector, {
        confidenceGate: 0.3, // Lower threshold for flow drills
      });
      
      await engine.initialize();
      engineRef.current = engine;
      
    } catch (error) {
      console.error('Failed to initialize engine:', error);
    }
  };

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    resetSafety();
  };

  const startRecording = async () => {
    if (!engineRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
        } 
      });
      
      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create a ScriptProcessorNode for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Compute RMS for loudness
        let rms = 0;
        for (let i = 0; i < inputData.length; i++) {
          rms += inputData[i] * inputData[i];
        }
        rms = Math.sqrt(rms / inputData.length);
        const normalizedLoudness = Math.min(1, rms * 10); // Scale for 0-1 range
        
        // Process audio through PitchEngine
        const result = engineRef.current?.pushSamples(inputData);
        if (result) {
          // Store last result for DiagnosticsHUD
          if (engineRef.current) {
            (engineRef.current as unknown as { __last: unknown }).__last = result;
          }
          
          const timestamp = performance.now();
          
          // Safety check
          const needsCooldown = updateSafety(normalizedLoudness, timestamp);
          if (needsCooldown && !showCooldown) {
            setShowCooldown(true);
            stopRecording();
            return;
          }
          
          // Collect drill data
          if (currentStep?.type === 'drill' && result.semitoneRel !== null && result.semitoneRel !== undefined) {
            drillDataRef.current.push({
              semitones: result.semitoneRel,
              time: timestamp / 1000, // Convert to seconds
              loudness: normalizedLoudness
            });
          }
          
          // Update metrics based on current drill type
          updateDrillMetrics(currentStep as DrillStep, result, normalizedLoudness);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      processorRef.current = processor;
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      
      setIsRecording(true);
      startTimeRef.current = performance.now();
      drillDataRef.current = []; // Reset drill data
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    resetSafety();
    
    // Process drill results
    if (currentStep?.type === 'drill') {
      processDrillResults(currentStep as DrillStep);
    }
  }, [currentStep]);

  const updateDrillMetrics = (step: DrillStep | null, result: unknown, _loudness: number) => {
    if (!step || step.type !== 'drill') return;
    
    const metrics: DrillMetrics = { ...drillMetrics };
    
    // Type guard for result
    const pitchResult = result as { 
      metrics?: { jitterEma?: number }; 
      raw?: { confidence?: number }; 
      semitoneRel?: number | null;
    };
    
    // Update based on drill metrics
    if (step.metrics?.includes('jitterEma')) {
      metrics.jitterEma = pitchResult.metrics?.jitterEma || 0;
    }
    
    if (step.metrics?.includes('voicedTimePct')) {
      // Simple voiced time estimation based on confidence
      const isVoiced = (pitchResult.raw?.confidence || 0) > 0.3;
      // This would need more sophisticated tracking in a real implementation
      metrics.voicedTimePct = isVoiced ? 0.8 : 0.2; // Placeholder
    }
    
    setDrillMetrics(metrics);
  }, [drillMetrics]);

  const processDrillResults = useCallback((step: DrillStep) => {
    const data = drillDataRef.current;
    if (data.length === 0) return;
    
    const metrics: DrillMetrics = { ...drillMetrics };
    
    // Process based on drill type
    if (step.target?.intonation === 'rising') {
      // End-rise detection
      const semitones = data.map(d => d.semitones);
      const times = data.map(d => d.time);
      metrics.endRiseDetected = endRiseDetected(semitones, times);
    }
    
    if (step.metrics?.includes('prosodyVar')) {
      // Compute prosody variability
      const semitones = data.map(d => d.semitones);
      const mean = semitones.reduce((s, v) => s + v, 0) / semitones.length;
      const variance = semitones.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / semitones.length;
      metrics.prosodyVar = Math.min(1, variance / 4); // Normalize to 0-1
    }
    
    setDrillMetrics(metrics);
  }, [drillMetrics]);

  const nextStep = () => {
    if (!currentStep?.next) {
      // End of flow - create session summary
      const summary: SessionSummary = {
        flowName: flowJson.flowName,
        startTime: startTimeRef.current,
        endTime: performance.now(),
        stepResults: [] // Would collect from all completed steps
      };
      setSessionSummary(summary);
      return;
    }
    
    const nextStepData = flowJson.steps.find(s => s.id === currentStep.next);
    if (nextStepData) {
      setCurrentStep(nextStepData);
      setDrillMetrics({});
      drillDataRef.current = [];
    }
  };

  const renderStep = () => {
    if (!currentStep) return null;
    
    switch (currentStep.type) {
      case 'info':
        return <InfoStepComponent step={currentStep as InfoStep} onNext={nextStep} />;
      case 'drill':
        return (
          <DrillStepComponent 
            step={currentStep as DrillStep} 
            isRecording={isRecording}
            metrics={drillMetrics}
            onStart={startRecording}
            onStop={stopRecording}
            onNext={nextStep}
          />
        );
      case 'reflection':
        return <ReflectionStepComponent step={currentStep as ReflectionStep} onNext={nextStep} />;
      default:
        return null;
    }
  };

  if (showCooldown) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Take a Break</h2>
          <p className="text-gray-600 mb-6">
            Take a breath and relax your throat—want a lighter exercise?
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => setShowCooldown(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Continue
            </button>
            <button 
              onClick={nextStep}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showDeviceChangeToast) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Audio Device Changed</h2>
          <p className="text-gray-600 mb-6">
            Your audio device has changed. Please restart the recording when ready.
          </p>
          <button 
            onClick={() => setShowDeviceChangeToast(false)}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (sessionSummary) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Session Complete</h2>
          <p className="text-gray-600 mb-6">
            Great work! Your session has been saved locally.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {renderStep()}
      </div>
      {engineRef.current && <DiagnosticsHUD engine={engineRef.current} />}
    </div>
  );
}

// Step Components
function InfoStepComponent({ step, onNext }: { step: InfoStep; onNext: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">{step.title}</h1>
      <p className="text-gray-600 mb-8">{step.content}</p>
      <button 
        onClick={onNext}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Next
      </button>
    </div>
  );
}

function DrillStepComponent({ 
  step, 
  isRecording, 
  metrics, 
  onStart, 
  onStop, 
  onNext 
}: { 
  step: DrillStep; 
  isRecording: boolean; 
  metrics: DrillMetrics;
  onStart: () => void; 
  onStop: () => void; 
  onNext: () => void; 
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-4">{step.title}</h1>
      <p className="text-gray-600 mb-8">{step.copy}</p>
      
      {/* Metrics Display */}
      <div className="mb-8 space-y-2">
        {metrics.jitterEma !== undefined && (
          <div>Jitter: {metrics.jitterEma.toFixed(3)} st</div>
        )}
        {metrics.endRiseDetected !== undefined && (
          <div>End Rise: {metrics.endRiseDetected ? '✅' : '❌'}</div>
        )}
        {metrics.prosodyVar !== undefined && (
          <div>Prosody Var: {(metrics.prosodyVar * 100).toFixed(0)}%</div>
        )}
      </div>
      
      <div className="flex space-x-4">
        <button 
          onClick={isRecording ? onStop : onStart}
          className={`px-6 py-3 rounded-lg ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
        >
          {isRecording ? 'Stop' : 'Start'}
        </button>
        
        {!isRecording && (
          <button 
            onClick={onNext}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function ReflectionStepComponent({ step, onNext }: { step: ReflectionStep; onNext: () => void }) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-4">{step.title}</h1>
      <p className="text-gray-600 mb-8">{step.copy}</p>
      
      <div className="space-y-4">
        {step.prompts.map((prompt, i) => (
          <div key={i}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {prompt}
            </label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your response..."
            />
          </div>
        ))}
      </div>
      
      <button 
        onClick={onNext}
        className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Complete
      </button>
    </div>
  );
}
