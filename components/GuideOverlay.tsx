import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type GuideOverlayProps = {
  text: string;
  speakingRate?: number; // 0.5..2.0
  pitch?: number;        // 0..2 (Web Speech API)
};

export default function GuideOverlay({ text, speakingRate = 1.0, pitch = 1.0 }: GuideOverlayProps) {
  const [open, setOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const speak = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Math.max(0.5, Math.min(2, speakingRate));
    u.pitch = Math.max(0, Math.min(2, pitch));
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, [supported, text, speakingRate, pitch]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  const hue = useMemo(() => (isSpeaking ? 200 : 160), [isSpeaking]);

  return (
    <div className="fixed bottom-4 right-4 z-40" aria-live="polite" aria-atomic="true">
      <button
        className="px-3 py-2 rounded-lg shadow bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        aria-expanded={open}
        aria-controls="guide-overlay-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide guide' : 'Guide voice'}
      </button>

      {open && (
        <div
          id="guide-overlay-panel"
          role="region"
          aria-label="Guide voice controls"
          className="mt-2 w-80 max-w-[85vw] rounded-lg border shadow bg-white text-slate-900"
        >
          <div className="p-3 border-b">
            <div className="font-semibold text-sm">Guide voice</div>
            <div className="text-xs text-slate-600">Local-only TTS using your browser. No network.</div>
          </div>
          <div className="p-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded bg-green-600 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                onClick={speak}
                aria-label="Play guide voice"
              >
                Play
              </button>
              <button
                className="px-3 py-2 rounded bg-red-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                onClick={stop}
                aria-label="Stop guide voice"
              >
                Stop
              </button>
              {!supported && (
                <span className="text-xs text-red-700" role="status">Not supported in this browser</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="rate" className="text-sm">Rate</label>
              <output id="rate_out" aria-live="polite" className="text-xs">{speakingRate.toFixed(2)}</output>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="pitch" className="text-sm">Pitch</label>
              <output id="pitch_out" aria-live="polite" className="text-xs">{pitch.toFixed(2)}</output>
            </div>

            <div className="flex items-center justify-center">
              <svg viewBox="0 0 100 20" width="200" height="40" aria-hidden="true">
                <linearGradient id="gv" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor={`hsl(${hue},80%,60%)`} />
                  <stop offset="100%" stopColor={`hsl(${hue+40},80%,50%)`} />
                </linearGradient>
                <rect x="2" y="2" width="96" height="16" rx="8" fill="url(#gv)" opacity={isSpeaking ? 1 : 0.3} />
              </svg>
            </div>

            <p className="text-xs text-slate-600" role="note">
              "{text.slice(0, 80)}{text.length > 80 ? '…' : ''}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


