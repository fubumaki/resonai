import { openDB, type IDBPDatabase } from 'idb';

export interface SessionSummary {
  flowName: string;
  startTime: number;
  endTime: number;
  stepResults: Array<{
    stepId: string;
    success: boolean;
    metrics: Record<string, number | boolean>;
  }>;
}

const DB_NAME = 'resonai-flow-sessions';
const STORE_NAME = 'sessions';

export async function getSessionDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db: IDBPDatabase) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'startTime' });
      }
    }
  });
}

export async function saveSession(session: SessionSummary): Promise<void> {
  try {
    const db = await getSessionDb();
    await db.put(STORE_NAME, session);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

export async function getAllSessions(): Promise<SessionSummary[]> {
  try {
    const db = await getSessionDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const sessions = await tx.store.getAll();
    await tx.done;
    return sessions;
  } catch (error) {
    console.error('Failed to load sessions:', error);
    return [];
  }
}

export async function deleteAllSessions(): Promise<void> {
  try {
    const db = await getSessionDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
  } catch (error) {
    console.error('Failed to delete sessions:', error);
  }
}

export async function exportSessions(): Promise<string> {
  try {
    const sessions = await getAllSessions();
    return JSON.stringify({
      build: process.env.NEXT_PUBLIC_BUILD_SHA || 'dev',
      exportTime: Date.now(),
      sessions
    }, null, 2);
  } catch (error) {
    console.error('Failed to export sessions:', error);
    return '[]';
  }
}
