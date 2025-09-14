// Local-first event storage using IndexedDB
// Provides persistent storage for analytics events

export interface StoredEvent {
  ts: number;
  data: Record<string, unknown>;
}

const DB_NAME = 'resonai-analytics';
const STORE_NAME = 'events';
const DB_VERSION = 1;

// Simple IndexedDB wrapper
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'ts' });
        store.createIndex('timestamp', 'ts', { unique: true });
      }
    };
  });
}

export async function saveEvent(event: Record<string, unknown>): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return; // Skip in SSR or unsupported environments
  }

  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const storedEvent: StoredEvent = {
      ts: Date.now(),
      data: event
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(storedEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Failed to save event to IndexedDB:', error);
  }
}

export async function getAllEvents(): Promise<StoredEvent[]> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return [];
  }

  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.debug('Failed to retrieve events from IndexedDB:', error);
    return [];
  }
}

export async function clearEvents(): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return;
  }

  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.debug('Failed to clear events from IndexedDB:', error);
  }
}

export async function exportEvents(): Promise<string> {
  const events = await getAllEvents();
  const exportData = {
    build: process.env.NEXT_PUBLIC_BUILD_SHA || 'dev',
    exportTimestamp: Date.now(),
    eventCount: events.length,
    events: events.map(e => e.data)
  };
  
  return JSON.stringify(exportData, null, 2);
}
