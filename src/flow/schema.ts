import { z } from 'zod';

// Flow JSON v1 Schema Validation
export const FlowStepTypeSchema = z.enum(['info', 'drill', 'reflection']);

export const FlowStepBaseSchema = z.object({
  id: z.string().min(1),
  type: FlowStepTypeSchema,
  title: z.string().min(1),
  next: z.string().optional(),
});

export const InfoStepSchema = FlowStepBaseSchema.extend({
  type: z.literal('info'),
  content: z.string().min(1),
});

export const DrillTargetSchema = z.object({
  pitchRange: z.enum(['low', 'mid', 'high']).optional(),
  intonation: z.enum(['rising', 'falling', 'rise-fall']).optional(),
  phraseText: z.string().optional(),
});

export const DrillStepSchema = FlowStepBaseSchema.extend({
  type: z.literal('drill'),
  copy: z.string().min(1),
  durationSec: z.number().positive().optional(),
  target: DrillTargetSchema.optional(),
  metrics: z.array(z.string()).optional(),
  successThreshold: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
});

export const ReflectionStepSchema = FlowStepBaseSchema.extend({
  type: z.literal('reflection'),
  copy: z.string().min(1),
  prompts: z.array(z.string().min(1)).min(1),
});

export const FlowStepSchema = z.discriminatedUnion('type', [
  InfoStepSchema,
  DrillStepSchema,
  ReflectionStepSchema,
]);

export const FlowJsonSchema = z.object({
  version: z.literal(1),
  flowName: z.string().min(1),
  steps: z.array(FlowStepSchema).min(1),
});

// Validation functions
export function validateFlowJson(data: unknown): { success: boolean; error?: string } {
  try {
    FlowJsonSchema.parse(data);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Flow JSON validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

export function validateFlowSteps(steps: unknown[]): { success: boolean; error?: string } {
  try {
    z.array(FlowStepSchema).parse(steps);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Flow steps validation failed: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}
