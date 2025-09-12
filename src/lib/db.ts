export type SessionRecord = {
  ts: number;
  voicedTimePct: number;
  jitterEma: number;
  tiltEma: number;
  comfort: number;
  fatigue: number;
  euphoria: number;
  orb: string; // data URL of svg/png
  f0Series?: number[]; // optional recent F0s for sparkline
};

const DB_NAME = 'resonai-db';
const DB_VERSION = 1;
const STORE = 'sessions';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'ts' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putSession(session: SessionRecord): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function getAllSessions(): Promise<SessionRecord[]> {
  const db = await openDb();
  const result = await new Promise<SessionRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as SessionRecord[]) || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  // Sort newest first
  return result.sort((a, b) => b.ts - a.ts);
}


