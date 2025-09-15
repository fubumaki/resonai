'use client';

import { useEffect, useRef, useState } from 'react';
import { PitchEngine } from '@/audio/PitchEngine';
import { createCrepeDetector } from '@/audio/detectors/CrepeTinyDetector';
import YinDetector from '@/audio/detectors/YinDetector';
import DiagnosticsHUD from '@/components/DiagnosticsHUD';

interface TestResult {
  frequency: number;
  detectedHz: number | null;
  octaveError: number;
  lockInTime: number;
  success: boolean;
}

export default function SelfTestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const engineRef = useRef<PitchEngine | null>(null);
  const testStartTimeRef = useRef<number>(0);
  const lockInTimeRef = useRef<number>(0);

  // Test frequencies (Hz) - covering multiple octaves
  const testFrequencies = [110, 220, 440, 880]; // A2, A3, A4, A5
  const testNames = ['A2 (110 Hz)', 'A3 (220 Hz)', 'A4 (440 Hz)', 'A5 (880 Hz)'];

  useEffect(() => {
    initializeEngine();
    return () => {
      cleanup();
    };
  }, []);

  const initializeEngine = async () => {
    try {
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
        confidenceGate: 0.2, // Lower threshold for testing
      });
      
      await engine.initialize();
      engineRef.current = engine;
      
    } catch (error) {
      console.error('Failed to initialize engine:', error);
    }
  };

  const cleanup = () => {
    if (oscillator) {
      oscillator.stop();
      setOscillator(null);
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const generateTone = (frequency: number): OscillatorNode => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime); // Low volume to avoid feedback
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    setAudioContext(ctx);
    return osc;
  };

  const runTest = async (frequency: number, testIndex: number) => {
    if (!engineRef.current) return;
    
    setCurrentTest(testIndex);
    setIsRunning(true);
    setResults([]);
    
    // Generate test tone
    const osc = generateTone(frequency);
    setOscillator(osc);
    osc.start();
    
    // Set up audio capture and processing
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
        } 
      });
      
      const audioContext = new AudioContext({ sampleRate: 48000, latencyHint: 0 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      let hasLockedIn = false;
      let t0: number | undefined;
      let lockedAt: number | undefined;
      let grossErrorFrames = 0;
      let totalFrames = 0;
      const stableReadings: number[] = [];
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        const result = engineRef.current?.pushSamples(inputData);
        if (result) {
          // Store last result for DiagnosticsHUD
          if (engineRef.current) {
            (engineRef.current as unknown as { __last: unknown }).__last = result;
          }
          
          if (result.pitchHz && result.raw.confidence > 0.5) {
            if (t0 === undefined) t0 = performance.now();
            totalFrames++;
            
            const error = Math.abs(result.pitchHz - frequency) / frequency;
            if (error > 0.20) grossErrorFrames++; // 20% = Gross Pitch Error frame
            
            if (!lockedAt && error < 0.02) { // 2% = lock-in threshold
              lockedAt = performance.now();
              hasLockedIn = true;
            }
            
            stableReadings.push(result.pitchHz);
            
            // Keep only last 50 readings for stability check
            if (stableReadings.length > 50) {
              stableReadings.shift();
            }
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Run test for 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Stop everything
      osc.stop();
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      stream.getTracks().forEach(track => track.stop());
      
      // Calculate results with enhanced metrics
      if (stableReadings.length > 10) {
        const avgDetected = stableReadings.reduce((a, b) => a + b, 0) / stableReadings.length;
        const octaveError = Math.abs(Math.log2(avgDetected / frequency)) * 12; // in semitones
        const lockInTime = lockedAt && t0 ? (lockedAt - t0) : Infinity;
        const grossPitchError = totalFrames > 0 ? grossErrorFrames / totalFrames : 1;
        
        // Enhanced success criteria
        const success = octaveError < 0.5 && lockInTime < 100 && grossPitchError < 0.05;
        
        const result: TestResult = {
          frequency,
          detectedHz: avgDetected,
          octaveError,
          lockInTime: lockInTime === Infinity ? -1 : lockInTime,
          success
        };
        
        setResults(prev => [...prev, result]);
      } else {
        const result: TestResult = {
          frequency,
          detectedHz: null,
          octaveError: -1,
          lockInTime: -1,
          success: false
        };
        
        setResults(prev => [...prev, result]);
      }
      
    } catch (error) {
      console.error('Test failed:', error);
    }
    
    setCurrentTest(null);
    setIsRunning(false);
  };

  const runAllTests = async () => {
    setResults([]);
    testStartTimeRef.current = performance.now();
    
    for (let i = 0; i < testFrequencies.length; i++) {
      await runTest(testFrequencies[i], i);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between tests
    }
  };

  const getSuccessRate = () => {
    if (results.length === 0) return 0;
    const successful = results.filter(r => r.success).length;
    return (successful / results.length) * 100;
  };

  const getAvgLockInTime = () => {
    const validTimes = results.filter(r => r.lockInTime > 0).map(r => r.lockInTime);
    if (validTimes.length === 0) return -1;
    return validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  };

  const getAvgOctaveError = () => {
    const validErrors = results.filter(r => r.octaveError >= 0).map(r => r.octaveError);
    if (validErrors.length === 0) return -1;
    return validErrors.reduce((a, b) => a + b, 0) / validErrors.length;
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PitchEngine Self-Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
              <div className="space-y-4">
                <button
                  onClick={runAllTests}
                  disabled={isRunning}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isRunning ? 'Running Tests...' : 'Run All Tests'}
                </button>
                
                <div className="text-sm text-gray-400">
                  <p>Tests: {testNames.join(', ')}</p>
                  <p>Each test runs for 3 seconds</p>
                </div>
              </div>
            </div>
            
            {/* Individual Test Buttons */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Individual Tests</h3>
              <div className="space-y-2">
                {testFrequencies.map((freq, i) => (
                  <button
                    key={freq}
                    onClick={() => runTest(freq, i)}
                    disabled={isRunning}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed"
                  >
                    {testNames[i]} {currentTest === i ? '(Running...)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            {results.length > 0 && (
              <div className="mb-6 space-y-2">
                <div className="text-sm">
                  <strong>Success Rate:</strong> {getSuccessRate().toFixed(1)}%
                </div>
                <div className="text-sm">
                  <strong>Avg Lock-in Time:</strong> {getAvgLockInTime() > 0 ? `${getAvgLockInTime().toFixed(0)}ms` : 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Avg Octave Error:</strong> {getAvgOctaveError() > 0 ? `${getAvgOctaveError().toFixed(2)} st` : 'N/A'}
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {results.map((result, i) => (
                <div key={i} className={`p-3 rounded ${result.success ? 'bg-green-900' : 'bg-red-900'}`}>
                  <div className="font-semibold">{testNames[i]}</div>
                  <div className="text-sm space-y-1">
                    <div>Expected: {result.frequency} Hz</div>
                    <div>Detected: {result.detectedHz ? `${result.detectedHz.toFixed(1)} Hz` : 'No detection'}</div>
                    <div>Octave Error: {result.octaveError >= 0 ? `${result.octaveError.toFixed(2)} st` : 'N/A'}</div>
                    <div>Lock-in: {result.lockInTime > 0 ? `${result.lockInTime.toFixed(0)}ms` : 'No lock-in'}</div>
                    <div>Status: {result.success ? '✅ PASS' : '❌ FAIL'}</div>
                  </div>
                </div>
              ))}
            </div>
            
            {results.length === 0 && (
              <div className="text-gray-400 text-center py-8">
                No test results yet. Run a test to see results here.
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Enhanced Test Criteria</h3>
          <div className="text-sm space-y-2">
            <div><strong>Pass:</strong> Octave error &lt; 0.5 semitones, Lock-in time &lt; 100ms, GPE &lt; 5%</div>
            <div><strong>Target:</strong> Octave error &lt; 0.2 semitones, Lock-in time &lt; 50ms, GPE &lt; 2%</div>
            <div><strong>Method:</strong> 3-second sine wave test, confidence threshold 0.5, latencyHint: 0</div>
            <div><strong>GPE:</strong> Gross Pitch Error - frames with &gt;20% frequency deviation</div>
            <div><strong>Lock-in:</strong> First frame with &lt;2% frequency error</div>
          </div>
        </div>
      </div>
      
      {engineRef.current && <DiagnosticsHUD engine={engineRef.current} />}
    </main>
  );
}
