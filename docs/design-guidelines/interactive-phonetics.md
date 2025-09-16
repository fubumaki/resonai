# Interactive Phonetics UI Guidelines

This guide captures the shared UX patterns we already rely on when helping people hear and feel vocal targets. Use it as the default reference when implementing or reviewing flows that touch live pitch, microphone onboarding, or staged coaching feedback.

## Real-time pitch tracking surfaces

- **Gate visual telemetry until the mic is healthy.** The practice surface waits for `ready` before rendering meters, and keeps badges such as “Allow microphone to begin” and “Enable audio” visible while hardware is unavailable (`app/practice/page.tsx`).
- **Pair numeric readouts with target context.** The practice HUD anchors pitch, note names, clarity, and “in range” badges next to the animated orb and target sliders so learners immediately see what the live number means (`app/practice/page.tsx`).
- **Expose adjustable targets beside live feedback.** Use slider pairs so singers can tune ranges without leaving the flow; see the “Min/Max pitch” and “Min/Max brightness” controls wired to target bars (`app/practice/page.tsx`).
- **Keep labs aligned with production telemetry.** The pitch lab mirrors runtime prosody classification, announces the current label via `aria-live`, and explains that simulated frames stand in for the real worklet bridge when no mic is present (`app/labs/pitch/page.tsx`).
- **Ship drill widgets that speak in ranges.** `PitchBandDrill` renders a lane, announces whether the singer is “In band” or “Out of band,” and reports deviation in hertz so the cue remains quantitative (`components/drills/PitchBandDrill.tsx`).
- **Make visualization components self-describing.** The orb component exposes resonance hue, tilt, and chip summaries through an accessible `role="img"` wrapper and labelled trend badges so the same visual can appear in practice, coach, or labs contexts (`components/Orb.tsx`).
- **Throttle coach feedback to avoid alert fatigue.** The coach hook filters hints, enforces a cooldown, and blends environment warnings with realtime policy output before rendering through the `CoachDisplay` components (`coach/useCoach.ts`, `coach/CoachDisplay.tsx`).

## Microphone permission and readiness flows

- **Set expectations before the permission prompt.** The start page tells users that microphone access is coming before they click through (`app/start/page.tsx`).
- **Prime and retry permission inline.** Instant Practice exposes a dedicated “Start with voice” button, tracks permission telemetry, and swaps the control into start/stop states once recording begins (`app/try/page.tsx`).
- **Surface device setup without breaking flow.** When practice is ready, keep the device picker inside the main panel with guidance like “Allow microphone to choose a device” and toggles for EC/NS/AGC (`app/practice/DevicePicker.tsx`).
- **Always render a mic-denied fallback.** The LPC lab explicitly explains when microphone access is denied and keeps readouts in a disabled state instead of hiding them (`app/labs/lpc/page.tsx`).
- **Echo the same status inside dev tooling.** The diagnostics lab bundles environment, device, coach, and loudness checkpoints, including a controlled confirmation dialog before destructive actions (`labs/diagnostics.tsx`).

## Progressive disclosure and pacing

- **Keep advanced settings in a popover, not always-on.** The practice settings chip reveals preset, low-power, and reset actions in a focus-managed panel so novice singers are not overwhelmed by controls (`app/practice/SettingsChip.tsx`, `components/AccessibleDialog.tsx`).
- **Use countdowns and badges to pace drills.** Guided trials show a micro-countdown, a “Recording…” badge, and a compact scoreboard of pitch/brightness stats so the learner understands what changed after each attempt (`app/practice/Trials.tsx`).
- **Announce coaching hints sparingly.** `CoachDisplay` limits the number of concurrent hints, decorates severity with icons, and speaks through polite live regions while the hook enforces cooldowns and environment checks (`coach/CoachDisplay.tsx`, `coach/useCoach.ts`).
- **Let operators escalate diagnostics deliberately.** The diagnostics lab’s clear-logs dialog reuses the accessible dialog focus trap, requires explicit confirmation, and keeps monitoring controls visible so troubleshooting is staged (`labs/diagnostics.tsx`).

## Gap analysis

| Module | Pattern(s) in play | Coverage in this doc | Follow-up needed |
| --- | --- | --- | --- |
| `app/practice/page.tsx` | Pitch HUD, mic readiness, staged coaching | ✅ Guidelines captured above | — |
| `components/drills/PitchBandDrill.tsx` | Pitch band drills | ✅ Covered under pitch tracking | — |
| `components/VoiceCanvas.tsx` | Canvas-based resonance lane | ⚠️ Add guidance on frame rates, fallback states, and how to expose targets on canvas overlays |
| `labs/diagnostics.tsx` | Progressive diagnostics tooling | ✅ Covered under microphone + progressive disclosure | — |
| `coach/CoachDebugHUD.tsx` | Developer-only overlays | ⚠️ Document when to enable HUD, minimum metrics to show, and how to avoid leaking debug affordances into production |

## How to use this document

1. Cite the relevant section in PR descriptions when shipping new microphone flows, pitch visualizations, or coaching hints.
2. When you add a new module that should follow these patterns, update both the narrative section and the gap table so the expectation is discoverable for the next engineer.
