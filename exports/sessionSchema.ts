import { z } from 'zod';

// ---- Versioned session export (v1) ----
export const SessionEntryV1 = z.object({
  id: z.union([z.number(), z.string()]),   // timestamp or autoinc
  ts: z.number().int().positive(),
  flowName: z.string().min(1),
  steps: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['info','drill','reflection']),
    metrics: z.record(z.string(), z.union([z.number(), z.boolean()]).nullable()).optional()
  })).min(1),

  // Key metrics from drills (optional by step)
  medianF0: z.number().positive().optional(),
  inBandPct: z.number().min(0).max(100).optional(),
  prosodyVar: z.number().min(0).max(1).optional(),
  voicedTimePct: z.number().min(0).max(100).optional(),
  jitterEma: z.number().min(0).optional(),
  endRiseDetected: z.boolean().optional(),

  // Reflection inputs
  comfort: z.number().min(1).max(5).optional(),
  fatigue: z.number().min(1).max(5).optional(),
  notes: z.string().optional()
});

export const SessionExportV1 = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  device: z.object({
    ua: z.string(),
    platform: z.string().optional(),
    browser: z.string().optional()
  }).optional(),
  sessions: z.array(SessionEntryV1).min(1)
});

export type SessionEntry = z.infer<typeof SessionEntryV1>;
export type SessionExport = z.infer<typeof SessionExportV1>;

// ---- Helpers ----
export function validateSessionExport(obj: unknown): SessionExport {
  const parsed = SessionExportV1.safeParse(obj);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `• ${i.path.join('.')||'(root)'}: ${i.message}`).join('\n');
    throw new Error(`Session export invalid:\n${msg}`);
  }
  return parsed.data;
}

export function makeSessionExport(sessions: SessionEntry[]): SessionExport {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    device: { ua: navigator.userAgent },
    sessions
  };
}
