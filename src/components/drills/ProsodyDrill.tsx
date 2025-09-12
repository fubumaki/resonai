'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { classifyProsody, ProsodyFrame } from '@/engine/audio/prosody';
import { computeExpressiveness } from '@/engine/audio/expressiveness';
import { ExpressivenessMeter } from '@/components/ExpressivenessMeter';
import { useTelemetryBuffer } from '@/engine/audio/useTelemetryBuffer';
import { track, ProsodyResult } from '@/engine/metrics/events';
import {
  PROSODY_WINDOW_MS, PROSODY_MIN_VOICED_MS,
  PROSODY_RISE_CENTS_PER_SEC, PROSODY_FALL_CENTS_PER_SEC,
  PROSODY_EMA_ALPHA, PROSODY_MIN_SAMPLES
} from '@/engine/audio/constants';

type Mode = 'statement' | 'question';
export type ProsodyDrillResult = {
  mode: Mode;
  label: 'rising' | 'falling' | 'flat';
  pass: boolean;
  expressiveness01: number;
  voicedMs: number;
  slopeCentsPerSec: number;
};

export function ProsodyDrill({
  text,
  mode,
  promptId,
  durationMs = 2500,
  onComplete
}: {
  text: string;
  mode: Mode;
  promptId?: string;
  durationMs?: number;
  onComplete: (r: ProsodyDrillResult) => void;
}) {
  const frames = useTelemetryBuffer({ windowMs: durationMs + 400 });
  const [active, setActive] = useState(false);
  const startT = useRef<number | null>(null);

  // Capture a fixed window once started
  const segment = useMemo<ProsodyFrame[]>(() => {
    if (!active || !frames.length) return [];
    if (startT.current == null) startT.current = frames[frames.length - 1].t;
    const t0 = startT.current, tEnd = t0 + durationMs;
    return frames.filter(f => f.t >= t0 && f.t <= tEnd).map(f => ({ t: f.t, f0Hz: f.f0Hz }));
  }, [active, frames, durationMs]);

  // Analyze prosody in real-time
  const prosody = useMemo(() => {
    if (!segment.length) return null;
    return classifyProsody(segment, {
      windowMs: PROSODY_WINDOW_MS,
      minVoicedMs: PROSODY_MIN_VOICED_MS,
      riseCentsPerSec: PROSODY_RISE_CENTS_PER_SEC,
      fallCentsPerSec: PROSODY_FALL_CENTS_PER_SEC,
      emaAlpha: PROSODY_EMA_ALPHA,
      minSamples: PROSODY_MIN_SAMPLES
    });
  }, [segment]);

  // Analyze expressiveness in real-time
  const expressiveness = useMemo(() => {
    if (!segment.length || !prosody) return null;
    const refHz = prosody.refHz || 1;
    const cents = segment
      .filter(f => f.f0Hz && f.f0Hz > 0)
      .map(f => 1200 * (Math.log(f.f0Hz! / refHz) / Math.log(2)));
    return computeExpressiveness(cents, prosody.voicedMs, { refSpreadCents: 300 });
  }, [segment, prosody]);

  // Auto finish when time elapsed
  useEffect(() => {
    if (!active || startT.current == null) return;
    const now = frames.at(-1)?.t ?? 0;
    if (now >= startT.current + durationMs) {
      const res = prosody ? {
        mode,
        label: prosody.label,
        pass: prosody.label === (mode === 'question' ? 'rising' : 'falling'),
        expressiveness01: expressiveness?.score01 || 0,
        voicedMs: prosody.voicedMs,
        slopeCentsPerSec: prosody.slopeCentsPerSec
      } : {
        mode,
        label: 'flat' as const,
        pass: false,
        expressiveness01: 0,
        voicedMs: 0,
        slopeCentsPerSec: 0
      };
      
      // Track the result
      if (promptId) {
        track({
          type: 'prosody_result',
          promptId,
          mode: res.mode,
          label: res.label,
          pass: res.pass,
          slopeCentsPerSec: res.slopeCentsPerSec,
          expressiveness01: res.expressiveness01,
          voicedMs: res.voicedMs
        } as Omit<ProsodyResult, 'ts' | 'build'>);
      }
      
      setActive(false);
      startT.current = null;
      onComplete(res);
    }
  }, [active, frames, segment, durationMs, mode, onComplete, promptId, prosody, expressiveness]);

  return (
    <div data-testid="prosody-drill" className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Prosody Drill</h3>
      
      <p className="mb-2">
        <strong>Say this {mode === 'question' ? 'as a question' : 'as a statement'}:</strong>
      </p>
      
      <p className="text-lg mb-4 p-3 bg-blue-50 rounded border">
        {text}
      </p>
      
      <button 
        onClick={() => { 
          setActive(true); 
          startT.current = null;
          // Track the start
          if (promptId) {
            track({ type: 'prosody_start', promptId, mode });
          }
        }} 
        disabled={active}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {active ? 'Recording…' : 'Start (≈2.5s)'}
      </button>
      
      {!active && (
        <p className="mt-2 text-sm text-gray-600">
          Tip: speak naturally; don&apos;t force an exaggerated contour.
        </p>
      )}
      
      {active && (
        <div className="mt-4">
          <div className="text-sm text-gray-600">
            Recording... ({segment.length} frames captured)
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-100" 
              style={{ 
                width: startT.current ? 
                  `${Math.min(100, ((frames.at(-1)?.t ?? 0) - startT.current) / durationMs * 100)}%` : 
                  '0%' 
              }}
            />
          </div>
        </div>
      )}
      
      {segment.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-600">
            <strong>Result:</strong> {prosody?.label?.toUpperCase() || 'FLAT'}
            {prosody && (
              <>
                {' '}· slope≈{prosody.slopeCentsPerSec.toFixed(0)} c/s · voiced {prosody.voicedMs.toFixed(0)}ms
              </>
            )}
          </div>
          <ExpressivenessMeter value01={expressiveness?.score01 || 0} />
        </div>
      )}
    </div>
  );
}
