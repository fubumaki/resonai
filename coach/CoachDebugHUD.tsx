// src/coach/CoachDebugHUD.tsx
// Developer-only debug HUD for coach policy verification

import React, { useState, useEffect } from 'react';
import { CoachHint } from './types';
import { useCoach } from './useCoach';

interface CoachDebugHUDProps {
  enabled: boolean;
  state: {
    iso: boolean;
    sab: boolean;
    simd: boolean;
    threads: number;
    modelOk: boolean;
    ec: boolean;
    ns: boolean;
    agc: boolean;
  };
  lastHint?: CoachHint | null;
  metrics: {
    jitterEma: number;
    loudNorm: number;
    timeInTargetPct: number;
    dtwTier?: number;
    endRise?: boolean;
  };
}

export function CoachDebugHUD({ 
  enabled, 
  state, 
  lastHint, 
  metrics 
}: CoachDebugHUDProps) {
  const [isVisible, setIsVisible] = useState(false);
  const coach = useCoach();

  useEffect(() => {
    // Toggle with URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const showHUD = urlParams.get('coachhud') === '1';
    setIsVisible(enabled && showHUD);
  }, [enabled]);

  if (!isVisible) return null;

  const debugState = (coach as { getDebugState?: () => Record<string, unknown> }).getDebugState?.() || {} as Record<string, unknown>;

  return (
    <div className="fixed top-4 right-4 w-80 bg-black bg-opacity-90 text-white text-xs font-mono p-4 rounded-lg z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Coach Debug HUD</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Environment Status */}
      <div className="mb-3">
        <div className="font-semibold mb-1">Environment</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className={state.iso ? 'text-green-400' : 'text-red-400'}>
            ISO: {state.iso ? '✅' : '❌'}
          </div>
          <div className={state.sab ? 'text-green-400' : 'text-red-400'}>
            SAB: {state.sab ? '✅' : '❌'}
          </div>
          <div className={state.simd ? 'text-green-400' : 'text-red-400'}>
            SIMD: {state.simd ? '✅' : '❌'}
          </div>
          <div className="text-blue-400">
            Threads: {state.threads}
          </div>
          <div className={state.modelOk ? 'text-green-400' : 'text-red-400'}>
            Model: {state.modelOk ? '✅' : '❌'}
          </div>
          <div className={!state.ec ? 'text-green-400' : 'text-yellow-400'}>
            EC: {state.ec ? 'ON' : 'OFF'}
          </div>
          <div className={!state.ns ? 'text-green-400' : 'text-yellow-400'}>
            NS: {state.ns ? 'ON' : 'OFF'}
          </div>
          <div className={!state.agc ? 'text-green-400' : 'text-yellow-400'}>
            AGC: {state.agc ? 'ON' : 'OFF'}
          </div>
        </div>
      </div>

      {/* Last Hint */}
      <div className="mb-3">
        <div className="font-semibold mb-1">Last Hint</div>
        {lastHint ? (
          <div>
            <div className="text-blue-400">ID: {lastHint.id}</div>
            <div className="text-gray-300">Text: {lastHint.text}</div>
            <div className="text-gray-300">
              Time since: {(debugState.timeSinceLastHint as number)?.toFixed(0)}ms
            </div>
            <div className="text-gray-300">
              Suppressed: {(debugState.timeSinceLastHint as number) < 1000 ? 'Rate limit' : 'None'}
            </div>
          </div>
        ) : (
          <div className="text-gray-400">No hints yet</div>
        )}
      </div>

      {/* Live Metrics */}
      <div className="mb-3">
        <div className="font-semibold mb-1">Live Metrics</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Jitter:</span>
            <span className={metrics.jitterEma > 0.35 ? 'text-red-400' : 'text-green-400'}>
              {metrics.jitterEma.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Loudness:</span>
            <span className={metrics.loudNorm > 0.8 ? 'text-red-400' : 'text-green-400'}>
              {metrics.loudNorm.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Target:</span>
            <span className={metrics.timeInTargetPct < 0.5 ? 'text-yellow-400' : 'text-green-400'}>
              {(metrics.timeInTargetPct * 100).toFixed(0)}%
            </span>
          </div>
          {metrics.dtwTier && (
            <div className="flex justify-between">
              <span>DTW Tier:</span>
              <span className={metrics.dtwTier >= 4 ? 'text-green-400' : 'text-yellow-400'}>
                {metrics.dtwTier}/5
              </span>
            </div>
          )}
          {metrics.endRise !== undefined && (
            <div className="flex justify-between">
              <span>End Rise:</span>
              <span className={metrics.endRise ? 'text-green-400' : 'text-red-400'}>
                {metrics.endRise ? '✅' : '❌'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Policy State */}
      <div className="mb-3">
        <div className="font-semibold mb-1">Policy State</div>
        <div className="space-y-1 text-xs">
          <div>Step time: {(debugState.timeSinceStepStart as number)?.toFixed(0)}ms</div>
          <div>Last hint ID: {(debugState.lastHintId as string) || 'None'}</div>
          <div>Last hint time: {(debugState.lastHintAt as number)?.toFixed(0)}ms</div>
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <div className="font-semibold mb-1">Thresholds</div>
        <div className="space-y-1 text-xs">
          <div>Loud: ≥0.80</div>
          <div>Jitter: ≥0.35</div>
          <div>Target: ≥0.50</div>
          <div>Confidence: ≥0.30</div>
        </div>
      </div>
    </div>
  );
}

// Hook to get current environment state for debug HUD
export function useCoachDebugState() {
  const [state, setState] = useState({
    iso: false,
    sab: false,
    simd: false,
    threads: 0,
    modelOk: false,
    ec: false,
    ns: false,
    agc: false
  });

  useEffect(() => {
    const updateState = async () => {
      const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
      const hasSAB = typeof SharedArrayBuffer !== 'undefined';
      const hasSIMD = typeof WebAssembly !== 'undefined' && 
                     WebAssembly.validate && 
                     WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      
      // Check audio constraints
      let ec = false, ns = false, agc = false;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            sampleRate: 48000,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
          } 
        });
        const track = stream.getAudioTracks()[0];
        const settings = track.getSettings();
        ec = settings.echoCancellation || false;
        ns = settings.noiseSuppression || false;
        agc = settings.autoGainControl || false;
        stream.getTracks().forEach(t => t.stop());
      } catch (error) {
        console.warn('Could not check audio constraints:', error);
      }

      setState({
        iso: isIsolated,
        sab: hasSAB,
        simd: hasSIMD,
        threads: navigator.hardwareConcurrency || 0,
        modelOk: true, // Assume model is available if we got this far
        ec,
        ns,
        agc
      });
    };

    updateState();
  }, []);

  return state;
}
