# Guiding AI Trainer

A local-first coaching layer that provides real-time, gentle guidance during voice practice sessions. The trainer sits on top of your Flow Runner and Pitch Engine, turning metrics into actionable feedback without ever leaving the device.

## Features

- **Pre-lesson briefs**: Focus goals and setup reminders
- **Real-time micro-hints**: Gentle guidance during practice (max 1/second)
- **End-utterance feedback**: Immediate summary with actionable advice
- **Post-session reflection**: Adaptive nudges for next time
- **Safety first**: Loudness monitoring and break suggestions
- **Accessibility**: Full ARIA live region support
- **Privacy**: 100% local processing, no audio leaves the device

## Architecture

```
src/coach/
├── types.ts           # TypeScript interfaces and types
├── policyDefault.ts   # Default coaching policy with rules
├── utils.ts          # Utility functions for metrics and DTW
├── useCoach.ts       # React hook for coach integration
├── CoachDisplay.tsx  # UI components for showing hints
└── index.ts          # Exports
```

## Quick Start

```tsx
import { useCoach, CoachDisplay } from '@/coach';

function MyComponent() {
  const coach = useCoach({
    maxHintsPerSecond: 1,
    hintCooldownMs: 1000,
    enableAria: true
  });

  // Start session
  coach.startSession('My Flow');

  // Start step
  coach.startStep('step-1', 'drill', stepData);

  // Add metrics during practice
  const snapshot = createMetricSnapshot(result, timestamp, timeInTarget);
  coach.addMetricSnapshot(snapshot);

  // End step
  const result = coach.endStep('step-1', 'drill', true, additionalMetrics);

  return (
    <div>
      <CoachDisplay hints={coach.getCurrentHints()} />
    </div>
  );
}
```

## Integration with Flow Runner

The `FlowRunnerWithCoach` component extends the original FlowRunner with coach integration:

```tsx
import { FlowRunnerWithCoach } from '@/flow/FlowRunnerWithCoach';

<FlowRunnerWithCoach flowJson={flowData} />
```

## Coaching Policy

The default policy implements these rules:

### Warmup (SOVT/hum)
- **Smoothness**: "Nice—tone's getting steadier. Keep the airflow easy."
- **Safety**: "Let it be lighter for a moment. Breath, then continue?"

### Glide
- **Target adherence**: "Try a slower sweep—small steps, smooth and connected."
- **Smoothness**: "Imagine drawing one line—no dots. Glide gently through the middle."

### Phrase (prosody)
- **End-rise**: "On the last word, let it float up a little."
- **DTW tier 2-3**: "You've got the shape—try a touch more lift on the second syllable."
- **DTW tier 4-5**: "Lovely contour match! One more for consistency."

## Metrics

The coach processes these metrics in real-time:

- `jitterEma`: Smoothness (lower is better)
- `timeInTarget`: Target adherence per frame
- `endRiseDetected`: Phrase end detection
- `dtwTier`: DTW match quality (1-5)
- `loudNorm`: Normalized loudness (0-1)
- `confidence`: Pitch detection confidence

## Accessibility

All feedback is announced via ARIA live regions:

```tsx
import { useCoachAria } from '@/coach/useCoach';

const { announceHint } = useCoachAria();

// Announce a hint
announceHint(hint);
```

## Customization

Create custom policies by implementing the `CoachPolicy` interface:

```tsx
const customPolicy: CoachPolicy = {
  pre(step) {
    // Pre-step hints
    return [{ id: 'custom', text: 'Custom hint' }];
  },
  realtime(snapshots) {
    // Real-time hints
    return [];
  },
  post(agg) {
    // Post-step feedback
    return [];
  }
};

const coach = useCoach({ policy: customPolicy });
```

## Testing

Visit `/coach-test` to see the coach system in action with a test flow.

## Privacy

- No audio data leaves the device
- Only small numeric summaries are stored in IndexedDB
- All processing happens locally
- Data is exportable and deletable offline
