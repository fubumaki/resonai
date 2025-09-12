// src/engine/audio/useTelemetryBuffer.ts
import { useEffect, useRef, useState } from 'react';

// Mock Telemetry type - replace with your actual implementation
export interface Telemetry {
  t?: number;           // ms timestamp (monotonic)
  f0Hz?: number | null; // null for unvoiced
}

type Frame = { t: number; f0Hz: number | null };

export interface UseTelemetryBufferOpts {
  /** Window of audio (ms) to retain in the buffer (default 2000). */
  windowMs?: number;
  /** Max UI update rate (Hz). We coalesce updates to once per RAF anyway; this caps bursts. */
  maxUiHz?: number;
}

// Mock worklet bridge for development - replace with your actual implementation
const mockWorkletBridge = {
  onTelemetry: (callback: (telem: Telemetry) => void) => {
    // Simulate telemetry data for development
    const interval = setInterval(() => {
      const now = performance.now();
      const simulatedF0 = Math.random() > 0.3 ? 180 + Math.random() * 40 : null;
      callback({ t: now, f0Hz: simulatedF0 });
    }, 50); // 20Hz update rate

    return () => clearInterval(interval);
  }
};

// Development-only injection for mock patterns
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (mockWorkletBridge as unknown as Record<string, unknown>).__inject = (telem: Telemetry) => {
    // Call all observers as if it came from the worklet
    // Ensure 't' is performance.now() compatible
    telem.t = telem.t ?? performance.now();
    // This would normally dispatch to listeners in a real bridge
    // For now, we'll use a simple global event system
    if (typeof window !== 'undefined') {
      ((window as unknown as Record<string, unknown>).__mockTelemetryCallback as ((telem: Telemetry) => void))?.(telem);
    }
  };
}

/**
 * Buffers the last N ms of telemetry frames for lightweight analysis (e.g., prosody).
 * - Set-state only once per animation frame to minimize re-renders.
 * - Trims old frames as new ones arrive; avoids unbounded growth.
 * - Tolerates sparse / null F0 frames.
 */
export function useTelemetryBuffer(opts: UseTelemetryBufferOpts = {}) {
  const { windowMs = 2000, maxUiHz = 60 } = opts;

  const [frames, setFrames] = useState<Frame[]>([]);
  const ref = useRef<{
    buf: Frame[];
    lastPushT: number;
    rafScheduled: boolean;
    minDeltaMs: number;
  }>({
    buf: [],
    lastPushT: 0,
    rafScheduled: false,
    minDeltaMs: 1000 / Math.max(1, Math.min(120, maxUiHz))
  });

  useEffect(() => {
    // handler called on each telemetry sample from workletBridge
    const off = mockWorkletBridge.onTelemetry((telem: Telemetry) => {
      // required: Telemetry.t is a monotonically increasing ms timestamp
      const now = telem.t ?? performance.now();
      const { buf, minDeltaMs } = ref.current;

      // Push minimal frame for prosody
      buf.push({ t: now, f0Hz: telem.f0Hz ?? null });

      // Trim outside window
      const cutoff = now - windowMs;
      // Fast trim while oldest is outside window
      while (buf.length && buf[0].t < cutoff) buf.shift();

      // Throttle + coalesce setState to once per RAF for UI stability
      const since = now - ref.current.lastPushT;
      if (!ref.current.rafScheduled && since >= minDeltaMs) {
        ref.current.rafScheduled = true;
        requestAnimationFrame(() => {
          ref.current.lastPushT = now;
          ref.current.rafScheduled = false;
          // Important: create a new array reference to trigger React reconciliation
          setFrames(buf.slice());
        });
      }
    });

    return () => {
      try { off?.(); } catch { /* ignore */ }
      ref.current.buf = [];
      ref.current.rafScheduled = false;
    };
  }, [windowMs, maxUiHz]);

  return frames;
}
