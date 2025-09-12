// src/engine/audio/constants.ts
// Centralized audio processing constants for easy tuning

// Prosody defaults (tweak via labs)
export const PROSODY_WINDOW_MS = 1200;
export const PROSODY_MIN_VOICED_MS = 300;
export const PROSODY_RISE_CENTS_PER_SEC = 250;
export const PROSODY_FALL_CENTS_PER_SEC = -250;
export const PROSODY_EMA_ALPHA = 0.25;
export const PROSODY_MIN_SAMPLES = 8;

// Legacy format for backward compatibility
export const PROSODY_DEFAULTS = {
  windowMs: PROSODY_WINDOW_MS,
  minVoicedMs: PROSODY_MIN_VOICED_MS,
  riseCentsPerSec: PROSODY_RISE_CENTS_PER_SEC,
  fallCentsPerSec: PROSODY_FALL_CENTS_PER_SEC,
  emaAlpha: PROSODY_EMA_ALPHA,
  minSamples: PROSODY_MIN_SAMPLES
} as const;

// Voice feminization target ranges (Hz)
export const VOICE_RANGES = {
  masculine: { min: 85, max: 180 },
  androgynous: { min: 140, max: 200 },
  feminine: { min: 165, max: 265 }
} as const;

// Formant frequency targets for voice feminization
export const FORMANT_TARGETS = {
  f1: { masculine: 700, feminine: 500 },
  f2: { masculine: 1200, feminine: 1600 }
} as const;
