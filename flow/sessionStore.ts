import { openDB, type IDBPDatabase } from 'idb';
import { SessionEntry, makeSessionExport, validateSessionExport } from '@/exports/sessionSchema';

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
    const exportData = makeSessionExport(sessions.map(s => ({
      id: s.startTime,
      ts: s.startTime,
      flowName: s.flowName,
      steps: s.stepResults.map(sr => ({
        id: sr.stepId,
        type: 'drill' as const,
        metrics: sr.metrics
      }))
    })));
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export sessions:', error);
    throw error;
  }
}

export async function importSessions(jsonData: string): Promise<void> {
  try {
    const parsed = validateSessionExport(JSON.parse(jsonData));
    await deleteAllSessions();
    const db = await getSessionDb();
    
    for (const session of parsed.sessions) {
      const sessionSummary: SessionSummary = {
        flowName: session.flowName,
        startTime: session.ts,
        endTime: session.ts + 300000, // Estimate 5 minutes
        stepResults: session.steps.map(step => ({
          stepId: step.id,
          success: true,
          metrics: Object.fromEntries(
            Object.entries(step.metrics || {}).map(([k, v]) => [k, v === null ? false : v])
          ) as Record<string, number | boolean>
        }))
      };
      await db.put(STORE_NAME, sessionSummary);
    }
    console.log(`Imported ${parsed.sessions.length} sessions`);
  } catch (error) {
    console.error('Failed to import sessions:', error);
    throw error;
  }
}
