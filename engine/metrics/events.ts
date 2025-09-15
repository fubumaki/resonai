type Base = { 
  ts: number; 
  build: string; 
  sessionId: string; 
  eventVersion: string;
  deviceHint?: string;
};

export type ProsodyStart = Base & {
  type: 'prosody_start'; 
  promptId: string; 
  mode: 'statement' | 'question';
};

export type ProsodyResult = Base & {
  type: 'prosody_result';
  promptId: string;
  mode: 'statement' | 'question';
  label: 'rising' | 'falling' | 'flat';
  pass: boolean;
  slopeCentsPerSec: number;
  expressiveness01: number;
  voicedMs: number;
};

export type Event = ProsodyStart | ProsodyResult;

function buildId(): string { 
  return process.env.NEXT_PUBLIC_BUILD_SHA || 'dev'; 
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Get or create session ID
  let sessionId = sessionStorage.getItem('resonai-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('resonai-session-id', sessionId);
  }
  return sessionId;
}

function getDeviceHint(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android')) return 'mobile';
  if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
  return 'desktop';
}

export function track(e: Omit<Event, 'ts' | 'build' | 'sessionId' | 'eventVersion' | 'deviceHint'>): void {
  const payload = { 
    ...e, 
    ts: Date.now(), 
    build: buildId(),
    sessionId: getSessionId(),
    eventVersion: '1.0',
    deviceHint: getDeviceHint()
  } as Event;
  
  // Local-first storage: console + IndexedDB
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__events = 
      (window as unknown as Record<string, unknown>).__events || [];
    ((window as unknown as Record<string, unknown>).__events as Event[]).push(payload);
    
    // Save to IndexedDB for persistence
    import('./eventStore').then(({ saveEvent }) => saveEvent(payload));
  }
  
  // eslint-disable-next-line no-console
  console.debug('[event]', payload);
}

// Helper to get events for debugging/export
export function getEvents(): Event[] {
  if (typeof window === 'undefined') return [];
  return (window as unknown as Record<string, unknown>).__events as Event[] || [];
}

// Helper to clear events (useful for testing)
export function clearEvents(): void {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__events = [];
  }
}
