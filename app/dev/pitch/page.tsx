'use client';

import { useEffect, useRef, useState } from 'react';
import { createCrepeDetector } from '@/audio/detectors/CrepeTinyDetector';
import YinDetector from '@/audio/detectors/YinDetector';
import { PitchEngine, DEFAULT_PITCH_ENGINE } from '@/audio/PitchEngine';

export default function DevPitchPage() {
  const [status, setStatus] = useState('Initializing...');
  const [isRecording, setIsRecording] = useState(false);
  const [pitchData, setPitchData] = useState<{
    pitchHz: number | null;
    semitoneRel: number | null;
    confidence: number;
    jitterEma: number;
    baselineHz: number;
  }>({
    pitchHz: null,
    semitoneRel: null,
    confidence: 0,
    jitterEma: 0,
    baselineHz: 0,
  });

  const engineRef = useRef<PitchEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    initializeEngine();
    return () => {
      const current = animationRef.current;
      if (current) {
        cancelAnimationFrame(current);
      }
    };
  }, []);

  const initializeEngine = async () => {
    try {
      setStatus('Initializing detector...');
      
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
      
      setStatus(`Using detector: ${detector.name}`);
      
      const engine = new PitchEngine(detector, {
        ...DEFAULT_PITCH_ENGINE,
        confidenceGate: 0.3, // Lower threshold for testing
      });
      
      await engine.initialize();
      
      engineRef.current = engine;
      setStatus(`Ready - ${detector.name}`);
      
    } catch (error) {
      console.error('Failed to initialize engine:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        
        // Process audio through PitchEngine
        const result = engineRef.current?.pushSamples(inputData);
        if (result) {
          setPitchData({
            pitchHz: result.pitchHz,
            semitoneRel: result.semitoneRel || null,
            confidence: result.raw.confidence,
            jitterEma: result.metrics.jitterEma || 0,
            baselineHz: result.metrics.baselineHz || 0,
          });
          
          drawPitchVisualization(result);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      setStatus('Recording...');
      
      // Store references for cleanup
      (window as unknown as Record<string, unknown>).__audioCleanup = () => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        setIsRecording(false);
        setStatus('Stopped');
      };
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setStatus(`Recording error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    const cleanup = (window as unknown as Record<string, unknown>).__audioCleanup as (() => void) | undefined;
    if (cleanup) {
      cleanup();
      delete (window as unknown as Record<string, unknown>).__audioCleanup;
    }
  };

  const drawPitchVisualization = (result: {
    pitchHz: number | null;
    semitoneRel?: number | null | undefined;
    raw: { confidence: number };
    metrics: { jitterEma?: number; baselineHz?: number };
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    if (result.pitchHz && result.metrics.baselineHz) {
      const semitones = result.semitoneRel || 0;
      
      // Draw pitch line (semitone relative to baseline)
      ctx.strokeStyle = result.raw.confidence > 0.5 ? '#00ff00' : '#ffaa00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const centerY = height / 2;
      const y = centerY - (semitones * 10); // 10 pixels per semitone
      
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Draw confidence indicator
      ctx.fillStyle = `rgba(0, 255, 0, ${result.raw.confidence})`;
      ctx.fillRect(width - 50, 10, 40, 20);
    }
    
    // Draw jitter indicator
    const jitterHeight = Math.min(height - 40, (result.metrics.jitterEma || 0) * 100);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(10, height - jitterHeight - 10, 20, jitterHeight);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PitchEngine Development Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Engine Status</h2>
              <div className="space-y-2">
                <div>Status: <span className="text-blue-400">{status}</span></div>
                <div>Cross-Origin Isolated: <span className={typeof window !== 'undefined' && window.crossOriginIsolated ? 'text-green-400' : 'text-red-400'}>
                  {typeof window !== 'undefined' && window.crossOriginIsolated ? 'Yes' : 'No'}
                </span></div>
                <div>SharedArrayBuffer: <span className={typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' ? 'text-green-400' : 'text-red-400'}>
                  {typeof window !== 'undefined' && typeof SharedArrayBuffer !== 'undefined' ? 'Available' : 'Not Available'}
                </span></div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Controls</h2>
              <div className="space-y-4">
                <button
                  onClick={startRecording}
                  disabled={isRecording || !engineRef.current}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isRecording ? 'Recording...' : 'Start Recording'}
                </button>
                
                <button
                  onClick={stopRecording}
                  disabled={!isRecording}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Stop Recording
                </button>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Live Data</h2>
              <div className="space-y-2 text-sm">
                <div>Pitch: <span className="text-yellow-400">
                  {pitchData.pitchHz ? `${pitchData.pitchHz.toFixed(1)} Hz` : 'Unvoiced'}
                </span></div>
                <div>Semitones: <span className="text-yellow-400">
                  {pitchData.semitoneRel !== null ? `${pitchData.semitoneRel.toFixed(2)} st` : 'N/A'}
                </span></div>
                <div>Confidence: <span className="text-yellow-400">
                  {(pitchData.confidence * 100).toFixed(1)}%
                </span></div>
                <div>Jitter EMA: <span className="text-yellow-400">
                  {pitchData.jitterEma.toFixed(3)} st
                </span></div>
                <div>Baseline: <span className="text-yellow-400">
                  {pitchData.baselineHz.toFixed(1)} Hz
                </span></div>
              </div>
            </div>
          </div>
          
          {/* Visualization */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pitch Visualization</h2>
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="w-full border border-gray-600 rounded"
            />
            <div className="mt-4 text-sm text-gray-400">
              <div>Green line: High confidence pitch</div>
              <div>Orange line: Low confidence pitch</div>
              <div>Red bar: Jitter level (smoothness)</div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>Input Rate: {DEFAULT_PITCH_ENGINE.inputSampleRate} Hz</div>
            <div>Model Rate: {DEFAULT_PITCH_ENGINE.modelSampleRate} Hz</div>
            <div>Hop: {DEFAULT_PITCH_ENGINE.hopSec * 1000} ms</div>
            <div>Median Window: {DEFAULT_PITCH_ENGINE.medianWindow}</div>
            <div>Q: {DEFAULT_PITCH_ENGINE.kalman.qSemitones2}</div>
            <div>R: {DEFAULT_PITCH_ENGINE.kalman.rSemitones2}</div>
            <div>Fast Lock: {DEFAULT_PITCH_ENGINE.kalman.fastLockFrames} frames</div>
            <div>Conf Gate: {DEFAULT_PITCH_ENGINE.confidenceGate}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
