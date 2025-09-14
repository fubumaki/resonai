/**
 * Feature flags for Instant Practice M0
 * Uses localStorage for client-side flags with fallback defaults
 */

export type FeatureFlag = 
  | 'ff.instantPractice'
  | 'ff.signUpFirst'
  | 'ff.permissionPrimerShort'
  | 'ff.bottomNav'
  | 'ff.haptics';

export const FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  'ff.instantPractice': true,
  'ff.signUpFirst': false,
  'ff.permissionPrimerShort': true,
  'ff.bottomNav': true,
  'ff.haptics': true,
};

export function getFeatureFlag(flag: FeatureFlag): boolean {
  if (typeof window === 'undefined') {
    return FEATURE_FLAGS[flag];
  }
  
  const stored = localStorage.getItem(flag);
  if (stored !== null) {
    return stored === 'true';
  }
  
  return FEATURE_FLAGS[flag];
}

export function setFeatureFlag(flag: FeatureFlag, value: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(flag, value.toString());
}

export function resetFeatureFlags(): void {
  if (typeof window === 'undefined') return;
  
  Object.keys(FEATURE_FLAGS).forEach(flag => {
    localStorage.removeItem(flag);
  });
}
