'use client';

import { useMemo, useState } from 'react';
import { useTelemetryBuffer } from '@/engine/audio/useTelemetryBuffer';
import { classifyProsody } from '@/engine/audio/prosody';
import { ProsodyHud, ProsodyHudValues } from '../_components/ProsodyHud';

import {
  PROSODY_WINDOW_MS,
  PROSODY_MIN_VOICED_MS,
  PROSODY_RISE_CENTS_PER_SEC,
  PROSODY_FALL_CENTS_PER_SEC,
  PROSODY_EMA_ALPHA,
  PROSODY_MIN_SAMPLES,
} from '@/engine/audio/constants';

export default function LabsPitch() {
  // Collect last ~2s of frames (t, f0Hz)
  const frames = useTelemetryBuffer({ windowMs: 2000 });

  // HUD state (seed from constants)
  const [hud, setHud] = useState<ProsodyHudValues>({
    windowMs: PROSODY_WINDOW_MS,
    minVoicedMs: PROSODY_MIN_VOICED_MS,
    rise: PROSODY_RISE_CENTS_PER_SEC,
    fall: PROSODY_FALL_CENTS_PER_SEC,
    ema: PROSODY_EMA_ALPHA,
    minSamples: PROSODY_MIN_SAMPLES,
  });

  // Classify using current HUD thresholds
  const prosody = useMemo(() => classifyProsody(
    frames.map(f => ({ t: f.t, f0Hz: f.f0Hz })),
    {
      windowMs: hud.windowMs,
      minVoicedMs: hud.minVoicedMs,
      riseCentsPerSec: hud.rise,
      fallCentsPerSec: hud.fall,
      emaAlpha: hud.ema,
      minSamples: hud.minSamples,
    }
  ), [frames, hud]);

  const getProsodyColor = (label: string) => {
    switch (label) {
      case 'rising': return 'text-green-600';
      case 'falling': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <main data-testid="labs-pitch-root" className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Pitch Lab</h1>

        {/* Current Pitch Display */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Pitch</h2>
          
          <div className="text-gray-500">
            <div>Simulated telemetry running...</div>
            <div className="text-sm mt-2">
              Frames: {frames.length} | Latest: {frames.length > 0 ? frames[frames.length - 1]?.f0Hz?.toFixed(0) + ' Hz' : '--'}
            </div>
          </div>
        </div>

        {/* Prosody Detection */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Prosody Detection</h2>
          <div aria-live="polite" className="flex items-center space-x-4">
            <div>
              <span className="text-gray-600">Prosody:</span>
              <span className={`ml-2 font-bold text-lg ${getProsodyColor(prosody.label)}`}>
                {prosody.label.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Slope: {prosody.slopeCentsPerSec.toFixed(0)} c/s
            </div>
            {prosody.insufficientVoiced && (
              <div className="text-sm text-orange-600">
                · insufficient voiced
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Samples: {prosody.sampleCount} | Voiced: {prosody.voicedMs.toFixed(0)}ms | Ref: {prosody.refHz.toFixed(0)}Hz
          </div>
        </div>

        {/* Fallback state for no-mic */}
        <div data-testid="no-mic-state" className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            <strong>Development Mode</strong>
            <p className="text-sm mt-1">
              Using simulated telemetry data. In production, this would connect to your actual microphone worklet bridge.
            </p>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <p className="text-gray-700">
            This lab shows real-time prosody analysis using simulated telemetry data. The prosody detector identifies rising, 
            falling, or flat intonation patterns. Use the HUD below to tune detection parameters in real-time. 
            Changes are persisted to localStorage when enabled.
          </p>
        </div>
      </div>

      {/* Floating HUD (persisted under prosody.hud) */}
      <ProsodyHud
        defaults={{
          windowMs: PROSODY_WINDOW_MS,
          minVoicedMs: PROSODY_MIN_VOICED_MS,
          rise: PROSODY_RISE_CENTS_PER_SEC,
          fall: PROSODY_FALL_CENTS_PER_SEC,
          ema: PROSODY_EMA_ALPHA,
          minSamples: PROSODY_MIN_SAMPLES,
        }}
        onChange={setHud}
        persistKey="prosody.hud"
      />
    </main>
  );
}
