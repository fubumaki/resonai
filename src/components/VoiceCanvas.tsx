'use client';

import { useCallback, useEffect, useRef } from 'react';

type VoiceCanvasProps = {
  onPermissionChange?: (granted: boolean) => void;
};

// Vertical "voice thread" visualization. Time flows top->bottom, amplitude/pitch map horizontally.
export default function VoiceCanvas({ onPermissionChange }: VoiceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataTimeRef = useRef<Uint8Array | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (analyserRef.current) analyserRef.current.disconnect();
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        onPermissionChange?.(true);

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;
        source.connect(analyser);
        dataTimeRef.current = new Uint8Array(analyser.fftSize);

        draw();
      } catch (err) {
        if (!cancelled) onPermissionChange?.(false);
      }
    }

    setup();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [cleanup, onPermissionChange]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const analyser = analyserRef.current;
    const dataTime = dataTimeRef.current;
    if (!canvas || !analyser || !dataTime) return;

    const ctx = canvas.getContext('2d');
    const over = overlay?.getContext('2d') ?? null;
    if (!ctx) return;

    const width = (canvas.width = canvas.clientWidth);
    const height = (canvas.height = canvas.clientHeight);
    if (overlay) {
      overlay.width = overlay.clientWidth;
      overlay.height = overlay.clientHeight;
    }

    const scrollSpeed = 2; // px per frame
    const threadHalfWidth = Math.max(1, Math.floor(width * 0.015));

    const step = () => {
      if (!analyserRef.current || !dataTimeRef.current) return;

      // Scroll the canvas down by scrollSpeed
      const imageData = ctx.getImageData(0, 0, width, height - scrollSpeed);
      ctx.putImageData(imageData, 0, scrollSpeed);
      ctx.clearRect(0, 0, width, scrollSpeed);

      // Read time domain data
      analyserRef.current.getByteTimeDomainData(dataTimeRef.current);

      // Compute zero-crossing rate as placeholder for pitch proxy
      let zeroCrossings = 0;
      for (let i = 1; i < dataTimeRef.current.length; i++) {
        const prev = dataTimeRef.current[i - 1] - 128;
        const curr = dataTimeRef.current[i] - 128;
        if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) zeroCrossings++;
      }
      const zcr = zeroCrossings / dataTimeRef.current.length; // 0..~0.5

      // Map amplitude to x position spread
      let sum = 0;
      for (let i = 0; i < dataTimeRef.current.length; i++) {
        const v = dataTimeRef.current[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / dataTimeRef.current.length) / 128; // 0..1

      // Pitch-ish mapping: lower ZCR -> left (lower pitch), higher -> right
      const xCenter = Math.floor(width * zcr);
      const half = Math.floor(threadHalfWidth * (0.4 + rms * 1.6));

      // Draw soft thread
      const grad = ctx.createLinearGradient(xCenter - half, 0, xCenter + half, 0);
      grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
      grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.8)');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(xCenter - half, 0, half * 2, scrollSpeed);

      // Overlay aura rings at the top as gentle indicator
      if (over) {
        over.clearRect(0, 0, width, height);
        over.globalAlpha = 0.15 + rms * 0.35;
        over.beginPath();
        const radius = 24 + rms * 28;
        over.arc(xCenter, 16, radius, 0, Math.PI * 2);
        over.fillStyle = 'rgb(99, 102, 241)'; // indigo-500
        over.fill();
        over.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    step();
  }, []);

  return (
    <div className="bg-background relative aspect-[3/4] w-full overflow-hidden rounded-md border">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <canvas ref={overlayRef} className="absolute inset-0 h-20 w-full" />
    </div>
  );
}
