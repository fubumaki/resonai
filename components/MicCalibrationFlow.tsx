'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { deviceManager } from '../audio/deviceManager';
import { calibrationAnalytics } from '../lib/analytics/calibration';

interface MicCalibrationFlowProps {
  onComplete: (config: MicCalibrationConfig) => void;
  onCancel: () => void;
}

interface MicCalibrationConfig {
  deviceId: string | null;
  constraints: MediaTrackConstraints;
  levelSettings: {
    gain: number;
    noiseFloor: number;
  };
}

interface Device {
  id: string;
  label: string;
}

type CalibrationStep = 'device' | 'level' | 'environment';

export default function MicCalibrationFlow({ onComplete, onCancel }: MicCalibrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<CalibrationStep>('device');
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseFloor, setNoiseFloor] = useState(0);

  // Load available devices
  useEffect(() => {
    // Track calibration start
    calibrationAnalytics.calibrationStarted();
    
    const loadDevices = async () => {
      try {
        setIsLoading(true);
        const deviceStatus = await deviceManager.checkDeviceStatus();
        
        if (!deviceStatus.hasAudio) {
          setError('No audio input devices found');
          calibrationAnalytics.calibrationError('No audio input devices found', 'device_enumeration');
          return;
        }

        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList
          .filter(d => d.kind === 'audioinput')
          .map(d => ({
            id: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`
          }));
        
        setDevices(audioInputs);
        
        // Auto-select first device if none selected
        if (!selectedDeviceId && audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].id);
        }
      } catch (e: any) {
        setError(e?.message ?? 'Could not enumerate devices');
      } finally {
        setIsLoading(false);
      }
    };

    loadDevices();
  }, [selectedDeviceId]);

  // Audio level monitoring
  useEffect(() => {
    if (!analyser || !stream) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let animationId: number;

    const monitorLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const level = (rms / 255) * 100; // Convert to percentage
      
      setAudioLevel(level);
      
      // Update noise floor (running minimum)
      if (level > 0 && (noiseFloor === 0 || level < noiseFloor)) {
        setNoiseFloor(level);
      }

      animationId = requestAnimationFrame(monitorLevel);
    };

    monitorLevel();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [analyser, stream, noiseFloor]);

  const startAudioMonitoring = useCallback(async () => {
    if (!selectedDeviceId) return;

    try {
      setError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Request microphone access
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setStream(newStream);

      // Set up audio analysis
      const context = new AudioContext();
      const source = context.createMediaStreamSource(newStream);
      const analyserNode = context.createAnalyser();
      
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      setAudioContext(context);
      setAnalyser(analyserNode);

      // Move to level calibration step
      setCurrentStep('level');
    } catch (e: any) {
      setError(`Could not access microphone: ${e.message}`);
    }
  }, [selectedDeviceId, stream]);

  const proceedToEnvironment = () => {
    setCurrentStep('environment');
  };

  const completeCalibration = () => {
    const config: MicCalibrationConfig = {
      deviceId: selectedDeviceId,
      constraints: {
        deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      levelSettings: {
        gain: audioLevel,
        noiseFloor: noiseFloor
      }
    };

    // Clean up
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (audioContext) {
      audioContext.close();
    }

    onComplete(config);
  };

  const retestMic = () => {
    setCurrentStep('device');
    setAudioLevel(0);
    setNoiseFloor(0);
    setError(null);
  };

  // Step 1: Device Selection
  if (currentStep === 'device') {
    return (
      <div className="panel col gap-8" role="dialog" aria-labelledby="calibration-title">
        <h2 id="calibration-title">Step 1: Select Microphone</h2>
        
        {error && <div role="alert" className="panel panel-danger">{error}</div>}
        
        {isLoading ? (
          <p>Loading available microphones...</p>
        ) : (
          <div className="col gap-6">
            <label className="col gap-2">
              <span>Choose your microphone:</span>
              <select
                value={selectedDeviceId ?? ''}
                onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                className="select-input"
                aria-label="Microphone selection"
              >
                <option value="">System default</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>
                    {device.label}
                  </option>
                ))}
              </select>
            </label>
            
            <p className="text-muted text-sm">
              Tip: Choose a USB microphone if available for steadier pitch tracking.
            </p>
          </div>
        )}

        <div className="row gap-6 justify-end">
          <button onClick={onCancel} className="button button--secondary">
            Cancel
          </button>
          <button 
            onClick={startAudioMonitoring}
            disabled={!selectedDeviceId || isLoading}
            className="button"
          >
            Test Microphone
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Level Calibration
  if (currentStep === 'level') {
    const isLevelGood = audioLevel > 10 && audioLevel < 90; // Good range
    const isNoiseFloorHigh = noiseFloor > 45; // dBFS equivalent warning
    
    return (
      <div className="panel col gap-8" role="dialog" aria-labelledby="calibration-title">
        <h2 id="calibration-title">Step 2: Level Calibration</h2>
        
        <div className="col gap-6">
          <div className="col gap-2">
            <label htmlFor="audio-level">Audio Level:</label>
            <div className="row gap-4 items-center">
              <div className="flex-1">
                <div 
                  id="audio-level"
                  className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={audioLevel}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Audio level: ${Math.round(audioLevel)}%`}
                >
                  <div 
                    className={`h-full transition-all duration-100 ${
                      isLevelGood ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-mono">{Math.round(audioLevel)}%</span>
            </div>
          </div>

          {isNoiseFloorHigh && (
            <div role="alert" className="panel panel-warning">
              <strong>High noise floor detected</strong>
              <p>Your environment may be too noisy for optimal voice training. Consider using a quieter space or a better microphone.</p>
            </div>
          )}

          {!isLevelGood && audioLevel > 0 && (
            <div role="alert" className="panel panel-info">
              <strong>Adjust your microphone</strong>
              <p>Speak at a normal volume and adjust your microphone distance until the level stays in the green zone.</p>
            </div>
          )}

          <p className="text-muted text-sm">
            Speak at a normal volume. The level should stay in the green zone (10-90%).
          </p>
        </div>

        <div className="row gap-6 justify-end">
          <button onClick={retestMic} className="button button--secondary">
            Retest Mic
          </button>
          <button 
            onClick={proceedToEnvironment}
            disabled={audioLevel === 0}
            className="button"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Environment Testing
  if (currentStep === 'environment') {
    const hasInput = audioLevel > 5;
    
    return (
      <div className="panel col gap-8" role="dialog" aria-labelledby="calibration-title">
        <h2 id="calibration-title">Step 3: Environment Test</h2>
        
        <div className="col gap-6">
          <div className="col gap-4">
            <p>Speak normally to test your microphone setup:</p>
            
            <div className="col gap-2">
              <label htmlFor="environment-level">Voice Input:</label>
              <div className="row gap-4 items-center">
                <div className="flex-1">
                  <div 
                    id="environment-level"
                    className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={audioLevel}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Voice input level: ${Math.round(audioLevel)}%`}
                  >
                    <div 
                      className={`h-full transition-all duration-100 ${
                        hasInput ? 'bg-green-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-mono">{Math.round(audioLevel)}%</span>
              </div>
            </div>

            {hasInput ? (
              <div role="status" className="text-green-600 dark:text-green-400">
                ✓ Microphone is working correctly
              </div>
            ) : (
              <div role="status" className="text-yellow-600 dark:text-yellow-400">
                Speak to test your microphone
              </div>
            )}
          </div>

          <p className="text-muted text-sm">
            Make sure your voice is being detected clearly. This ensures accurate pitch tracking during practice.
          </p>
        </div>

        <div className="row gap-6 justify-end">
          <button onClick={retestMic} className="button button--secondary">
            Retest Mic
          </button>
          <button 
            onClick={completeCalibration}
            disabled={!hasInput}
            className="button"
          >
            Complete Setup
          </button>
        </div>
      </div>
    );
  }

  return null;
}
