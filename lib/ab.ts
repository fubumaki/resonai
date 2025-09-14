/**
 * A/B Testing logic for Instant Practice M0
 * Simple, deterministic variant assignment using localStorage
 */

export type ExperimentKey = 'E1' | 'E2';
export type Variant = 'A' | 'B';

export function assignVariant(key: ExperimentKey): Variant {
  if (typeof window === 'undefined') {
    return 'A'; // Default to A on server side
  }

  const storageKey = `ab:${key}`;
  const existing = localStorage.getItem(storageKey);
  
  if (existing && (existing === 'A' || existing === 'B')) {
    return existing as Variant;
  }
  
  // Assign variant based on hash of session for consistency
  const sessionHash = getSessionHash();
  const variant = (sessionHash % 2 === 0) ? 'A' : 'B';
  
  localStorage.setItem(storageKey, variant);
  return variant;
}

function getSessionHash(): number {
  // Use a combination of user agent and timestamp for consistent hashing
  const seed = navigator.userAgent + Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // Daily rotation
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getExperimentVariant(key: ExperimentKey): Variant {
  return assignVariant(key);
}

export function isVariantA(key: ExperimentKey): boolean {
  return getExperimentVariant(key) === 'A';
}

export function isVariantB(key: ExperimentKey): boolean {
  return getExperimentVariant(key) === 'B';
}

// Experiment definitions
export const EXPERIMENTS = {
  E1: {
    name: 'Sign-up Timing',
    description: 'Lesson-first vs sign-up-first onboarding',
    variants: {
      A: 'lesson-first',
      B: 'sign-up-first'
    }
  },
  E2: {
    name: 'Permission Copy',
    description: 'Short primer vs native prompt only',
    variants: {
      A: 'short-primer',
      B: 'native-only'
    }
  }
} as const;
