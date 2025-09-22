'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FlowV1, FlowState, StepResult } from '@/flows/schema';
import PracticeHUD from '@/components/PracticeHUD';
import { usePracticeMetrics } from '@/hooks/usePracticeMetrics';

interface FlowRunnerProps {
  flow: FlowV1;
  onComplete?: (results: StepResult[]) => void;
  onStepChange?: (stepId: string, metrics: Record<string, number | boolean>) => void;
  className?: string;
}

interface ReflectionFormData {
  comfort: number;
  fatigue: number;
  euphoria: number;
  notes: string;
}

export default function FlowRunner({ 
  flow, 
  onComplete, 
  onStepChange,
  className = '' 
}: FlowRunnerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [flowState, setFlowState] = useState<FlowState>({
    currentStepId: flow.steps[0].id,
    stepStartTime: Date.now(),
    metrics: {},
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isActive: false
  });
  const [stepResults, setStepResults] = useState<StepResult[]>([]);
  const [reflectionData, setReflectionData] = useState<ReflectionFormData>({
    comfort: 3,
    fatigue: 3,
    euphoria: 3,
    notes: ''
  });
  const [isRecording, setIsRecording] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentStep = flow.steps[currentStepIndex];
  
  // Practice metrics for HUD
  const { metrics, isActive: metricsActive, start: startMetrics, stop: stopMetrics } = usePracticeMetrics(
    mediaStreamRef.current,
    {
      targetRanges: {
        pitchMin: 150, // F3
        pitchMax: 500, // B4
        brightnessMin: 0.2,
        brightnessMax: 0.8,
      },
      updateInterval: 16.67, // 60fps
      historyLength: 600, // 10 seconds at 60fps
    }
  );

  // Calculate derived metrics for the current step
  const calculateStepMetrics = useCallback((stepMetrics: string[], practiceMetrics: any): Record<string, number | boolean> => {
    const derived: Record<string, number | boolean> = {};
    
    stepMetrics.forEach(metric => {
      switch (metric) {
        case 'voicedTimePct':
          derived[metric] = practiceMetrics.voicedTimePct || 0;
          break;
        case 'jitterEma':
          derived[metric] = practiceMetrics.jitterEma || 0;
          break;
        case 'timeInTargetPct':
          derived[metric] = practiceMetrics.inRangePercentage / 100 || 0;
          break;
        case 'smoothness':
          derived[metric] = 1 - (practiceMetrics.jitterEma || 0); // Inverse of jitter for smoothness
          break;
        case 'endRiseDetected':
          derived[metric] = practiceMetrics.endRiseDetected || false;
          break;
        case 'expressiveness':
          derived[metric] = practiceMetrics.expressiveness || 0;
          break;
        default:
          derived[metric] = 0;
      }
    });
    
    return derived;
  }, []);

  // Start recording for drill steps
  const startRecording = async () => {
    if (currentStep.type !== 'drill') return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0
        } 
      });
      mediaStreamRef.current = stream;
      setIsRecording(true);
      setFlowState(prev => ({ ...prev, isActive: true, stepStartTime: Date.now() }));
      startMetrics();
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop recording and evaluate step
  const stopRecording = () => {
    if (!isRecording) return;
    
    setIsRecording(false);
    stopMetrics();
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Calculate step metrics
    const stepDuration = Date.now() - flowState.stepStartTime;
    const stepMetrics = calculateStepMetrics(currentStep.metrics, metrics);
    
    // Check success criteria
    const success = currentStep.successThreshold ? 
      Object.entries(currentStep.successThreshold).every(([key, threshold]) => {
        const value = stepMetrics[key];
        if (typeof threshold === 'boolean') {
          return value === threshold;
        }
        return typeof value === 'number' && value >= threshold;
      }) : true;
    
    const result: StepResult = {
      stepId: currentStep.id,
      duration: stepDuration,
      metrics: stepMetrics,
      success,
      nextStepId: currentStep.next
    };
    
    setStepResults(prev => [...prev, result]);
    onStepChange?.(currentStep.id, stepMetrics);
    
    // Move to next step or complete
    if (currentStep.next && currentStepIndex < flow.steps.length - 1) {
      const nextIndex = flow.steps.findIndex(step => step.id === currentStep.next);
      if (nextIndex !== -1) {
        setCurrentStepIndex(nextIndex);
        setFlowState(prev => ({
          ...prev,
          currentStepId: flow.steps[nextIndex].id,
          stepStartTime: Date.now(),
          metrics: stepMetrics
        }));
      }
    } else {
      // Flow complete
      if (currentStep.type === 'reflection') {
        setShowReflection(true);
      } else {
        onComplete?.(stepResults);
      }
    }
  };

  // Handle reflection form submission
  const handleReflectionSubmit = () => {
    const reflectionResult: StepResult = {
      stepId: 'reflection',
      duration: 0,
      metrics: {
        comfort: reflectionData.comfort,
        fatigue: reflectionData.fatigue,
        euphoria: reflectionData.euphoria,
        notes: reflectionData.notes.length
      },
      success: true
    };
    
    setStepResults(prev => [...prev, reflectionResult]);
    setShowReflection(false);
    onComplete?.([...stepResults, reflectionResult]);
  };

  // Auto-start recording for drill steps
  useEffect(() => {
    if (currentStep.type === 'drill' && !isRecording) {
      const timer = setTimeout(() => {
        startRecording();
      }, 2000); // 2 second delay to let user read instructions
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, isRecording]);

  // Auto-stop recording when duration is reached
  useEffect(() => {
    if (currentStep.type === 'drill' && currentStep.durationSec && isRecording) {
      stepTimerRef.current = setTimeout(() => {
        stopRecording();
      }, currentStep.durationSec * 1000);
      
      return () => {
        if (stepTimerRef.current) {
          clearTimeout(stepTimerRef.current);
        }
      };
    }
  }, [currentStep, isRecording]);

  const renderStep = () => {
    switch (currentStep.type) {
      case 'info':
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {currentStep.title}
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="whitespace-pre-line text-slate-600 dark:text-slate-400">
                {currentStep.content}
              </p>
            </div>
            <button
              onClick={() => {
                const nextIndex = flow.steps.findIndex(step => step.id === currentStep.next);
                if (nextIndex !== -1) {
                  setCurrentStepIndex(nextIndex);
                  setFlowState(prev => ({
                    ...prev,
                    currentStepId: flow.steps[nextIndex].id,
                    stepStartTime: Date.now()
                  }));
                }
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        );
        
      case 'drill':
        return (
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {currentStep.title}
            </h2>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-slate-600 dark:text-slate-400">
                {currentStep.copy}
              </p>
            </div>
            
            {currentStep.durationSec && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Duration: {currentStep.durationSec} seconds
              </div>
            )}
            
            <div className="flex flex-col items-center space-y-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Start Practice
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Stop Practice
                </button>
              )}
            </div>
          </div>
        );
        
      case 'reflection':
        if (showReflection) {
          return (
            <div className="max-w-md mx-auto space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
                {currentStep.title}
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-center">
                {currentStep.copy}
              </p>
              
              <div className="space-y-4">
                {currentStep.prompts.map((prompt, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {prompt}
                    </label>
                    {prompt.includes('1–5') ? (
                      <select
                        value={prompt.includes('Comfort') ? reflectionData.comfort : 
                               prompt.includes('fatigue') ? reflectionData.fatigue : reflectionData.euphoria}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (prompt.includes('Comfort')) {
                            setReflectionData(prev => ({ ...prev, comfort: value }));
                          } else if (prompt.includes('fatigue')) {
                            setReflectionData(prev => ({ ...prev, fatigue: value }));
                          } else {
                            setReflectionData(prev => ({ ...prev, euphoria: value }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      >
                        <option value={1}>1 - Very Low</option>
                        <option value={2}>2 - Low</option>
                        <option value={3}>3 - Medium</option>
                        <option value={4}>4 - High</option>
                        <option value={5}>5 - Very High</option>
                      </select>
                    ) : (
                      <textarea
                        value={reflectionData.notes}
                        onChange={(e) => setReflectionData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Share your thoughts..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        rows={3}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleReflectionSubmit}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Complete Practice
              </button>
            </div>
          );
        }
        return null;
        
      default:
        return null;
    }
  };

  return (
    <div className={`flow-runner ${className}`}>
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2">
          <span>Step {currentStepIndex + 1} of {flow.steps.length}</span>
          <span>{flow.flowName}</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / flow.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Practice HUD for drill steps */}
      {currentStep.type === 'drill' && isRecording && (
        <div className="mb-6">
          <PracticeHUD 
            metrics={metrics}
            isVisible={isRecording && metricsActive}
            className="max-w-md mx-auto"
          />
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[400px] flex items-center justify-center">
        {renderStep()}
      </div>
    </div>
  );
}
