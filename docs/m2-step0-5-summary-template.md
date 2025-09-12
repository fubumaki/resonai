# M2 Steps 0–5 Summary (Labs, LPC, Pitch Band)

Fill this out after completing Steps 0–5. Keep it short and link assets.

## 1) Build info
- Commit SHA: `____`
- Build URL (Vercel preview/prod): `____`
- Date/time (UTC): `____`

## 2) Performance numbers

### Desktop (Win/Mac mid‑range)
- Device/CPU/GPU: `____`
- Browser + version: `____`
- Latency (speech→visual, perceived): `____ ms`
- FPS (Pitch Band / labs pages): `____ fps`
- CPU during drills: `____ %`

### Android mid‑range
- Device: `____`
- Browser + version: `____`
- Latency (speech→visual, perceived): `____ ms`
- FPS: `____ fps`
- CPU (observed): `____ %` (approx)

Notes on measurement method: Chrome DevTools Performance (desktop); Android remote debugging (optional); visual latency estimated with short blips.

## 3) Labs screenshots
- /labs/pitch: ![pitch](<paste link or attach in issue>)
- /labs/lpc: ![lpc](<paste link or attach in issue>)

Include F0 readout and RMS/Tilt bars for pitch; F1/F2 or bucket dot on vowel map for LPC.

## 4) Pitch Band 30‑second capture
- Link to screen recording: `____`
- Observations:
  - % in band progression: `____`
  - Band width changes (tighten/relax): `____`
  - Any thrashing/latency notes: `____`

## 5) Stability & safety
- Any console errors/warnings: `____`
- Unvoiced/null handling (no flicker/NaN): `____`
- Clipping hint behavior: `____`
- Privacy check (no network calls during practice): `____`

## 6) Next tweaks (constants & smoothing)
List 3–5 specific adjustments to try next (e.g., `SILENCE_RMS`, `F0_SMOOTH_ALPHA`, LPC order/window/hop, band tighten/relax cents).

- `____`
- `____`
- `____`

## 7) Attachments
- Screenshots inline above
- Recording link(s)
- Raw notes/logs if useful
