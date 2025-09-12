# QA Checklist

## General
- [ ] Build passes (lint, typecheck, CI)
- [ ] No console errors on key pages
- [ ] Responsive design works on mobile/desktop
- [ ] Accessibility basics (keyboard nav, focus states)

## Audio Features
- [ ] Microphone permission handling works
- [ ] Audio visualization renders correctly
- [ ] Fallback UI shows when mic denied
- [ ] No memory leaks in audio processing

## Performance
- [ ] Page load times acceptable
- [ ] No excessive CPU usage during audio processing
- [ ] Smooth animations and transitions
- [ ] Memory usage stable over time

## Prosody System
- [ ] **Prosody practice**: Statement detects **fall** and Question detects **rise** in quiet room tests (≥70% success)
- [ ] **Expressiveness**: Meter increases with a more melodic read of the same prompt
- [ ] **Events**: `prosody_start` and `prosody_result` logged for each attempt (dev console or local sink)
- [ ] **Performance**: UI ≥45 fps and worklet→UI p95 <120 ms while running both drills

## Labs Pages
- [ ] `/labs/pitch` renders with HUD controls
- [ ] `/labs/lpc` shows formant placeholders
- [ ] `/labs/prosody` provides interactive training
- [ ] Performance overlays show accurate metrics
- [ ] Telemetry recorder captures data correctly

## Practice Session
- [ ] Session flow works end-to-end
- [ ] Progress tracking accurate
- [ ] Results display correctly
- [ ] Navigation between exercises smooth