'use client';

import { useEffect, useRef, useCallback } from 'react';
import { micEngine, hzToSemitoneOffset } from '@/engine/audio/mic';

export type VoiceCanvasProps = {
  targetBandHz?: [number, number];
  mode?: 'mirror' | 'pitch' | 'resonance' | 'prosody' | 'flow';
  science?: boolean;
};

export default function VoiceCanvas({
  targetBandHz = [180, 240],
  mode = 'mirror',
  science = false,
}: VoiceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Mutable telemetry snapshot for the draw loop
  const telemetryRef = useRef({
    f0Hz: null as number | null,
    f0Conf: 0,
    rms: 0,
    hfLf: 0,
    f1: null as number | null,
    f2: null as number | null,
  });
  const emaRef = useRef({ f0Hz: null as number | null, rms: 0, hfLf: 0 });

  useEffect(() => {
    const unsub = micEngine.subscribe((s) => {
      telemetryRef.current = {
        f0Hz: s.f0Hz,
        f0Conf: s.f0Conf,
        rms: s.rms,
        hfLf: s.hfLf,
        f1: s.f1,
        f2: s.f2,
      };
    });
    return () => unsub();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const over = overlay?.getContext('2d') ?? null;
    if (!ctx) return;

    const width = (canvas.width = canvas.clientWidth);
    const height = (canvas.height = canvas.clientHeight);
    if (overlay) {
      overlay.width = overlay.clientWidth;
      overlay.height = overlay.clientHeight;
    }

    const scrollSpeed = 2; // px/frame
    const semitoneRange = 12; // +/- 12 st maps to ~80% width
    const maxOffsetPx = Math.floor(width * 0.4);

    const step = () => {
      // scroll down
      const imageData = ctx.getImageData(0, 0, width, Math.max(0, height - scrollSpeed));
      ctx.putImageData(imageData, 0, scrollSpeed);
      ctx.clearRect(0, 0, width, scrollSpeed);

      // Smooth telemetry (EMA)
      const alpha = 0.25;
      const t = telemetryRef.current;
      if (t.f0Hz != null) {
        emaRef.current.f0Hz =
          emaRef.current.f0Hz == null ? t.f0Hz : emaRef.current.f0Hz * (1 - alpha) + t.f0Hz * alpha;
      }
      emaRef.current.rms = emaRef.current.rms * (1 - alpha) + t.rms * alpha;
      emaRef.current.hfLf = emaRef.current.hfLf * (1 - alpha) + t.hfLf * alpha;

      // Map to x-center by semitone offset from band center
      const centerHz = (targetBandHz[0] + targetBandHz[1]) / 2;
      let xCenter = Math.floor(width / 2);
      if (emaRef.current.f0Hz && emaRef.current.f0Hz > 0) {
        const st = hzToSemitoneOffset(emaRef.current.f0Hz, centerHz);
        const clamped = Math.max(-semitoneRange, Math.min(semitoneRange, st));
        xCenter = Math.floor(width / 2 + (clamped / semitoneRange) * maxOffsetPx);
      }

      const rms01 = Math.max(0, Math.min(1, emaRef.current.rms * 4));
      const threadHalf = Math.max(1, Math.floor(width * 0.01 * (0.6 + rms01 * 1.8)));

      // Draw thread row
      const grad = ctx.createLinearGradient(xCenter - threadHalf, 0, xCenter + threadHalf, 0);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
      grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.85)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(xCenter - threadHalf, 0, threadHalf * 2, scrollSpeed);

      // Overlay target band lane (soft glow)
      if (over) {
        over.clearRect(0, 0, width, overlay!.height);
        const lowSt = hzToSemitoneOffset(targetBandHz[0], centerHz);
        const highSt = hzToSemitoneOffset(targetBandHz[1], centerHz);
        const leftX = Math.floor(
          width / 2 +
            (Math.max(-semitoneRange, Math.min(semitoneRange, lowSt)) / semitoneRange) *
              maxOffsetPx,
        );
        const rightX = Math.floor(
          width / 2 +
            (Math.max(-semitoneRange, Math.min(semitoneRange, highSt)) / semitoneRange) *
              maxOffsetPx,
        );
        const laneLeft = Math.min(leftX, rightX);
        const laneWidth = Math.max(8, Math.abs(rightX - leftX));
        const g = over.createLinearGradient(laneLeft, 0, laneLeft + laneWidth, 0);
        g.addColorStop(0, 'rgba(129, 140, 248, 0.05)');
        g.addColorStop(0.5, 'rgba(129, 140, 248, 0.18)');
        g.addColorStop(1, 'rgba(129, 140, 248, 0.05)');
        over.fillStyle = g;
        over.fillRect(laneLeft, 0, laneWidth, overlay!.height);

        // Aura pulse at top based on loudness
        over.globalAlpha = 0.15 + rms01 * 0.35;
        over.beginPath();
        over.arc(xCenter, 18, 18 + rms01 * 22, 0, Math.PI * 2);
        over.fillStyle = 'rgb(99, 102, 241)';
        over.fill();
        over.globalAlpha = 1;

        if (science) {
          over.fillStyle = 'rgba(0,0,0,0.6)';
          over.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          over.fillText(
            `f0=${t.f0Hz?.toFixed(1) ?? '-'}Hz conf=${t.f0Conf.toFixed(2)} rms=${t.rms.toFixed(3)}`,
            8,
            12,
          );
        }
      }

      rafRef.current = requestAnimationFrame(step);
    };

    step();
  }, [targetBandHz, mode, science]);

  useEffect(() => {
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div className="bg-background relative aspect-[3/4] w-full overflow-hidden rounded-md border">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={overlayRef} className="absolute inset-0 h-20 w-full" />
    </div>
  );
}
