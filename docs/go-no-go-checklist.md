# Go/No-Go Checklist - Production Readiness

## ✅ Cross-Origin Isolation
- [ ] `/dev/status` shows: **crossOriginIsolated = true**
- [ ] **WASM SIMD = ✅**
- [ ] **WASM threads = ✅**
- [ ] Refresh **offline** (via DevTools) → still isolated
- [ ] No COEP/CORP blocks in console

## ✅ Mic Path & Stability (12-min run)
- [ ] `getUserMedia` **EC/NS/AGC = false** verified via `getSettings()`
- [ ] AudioContext `latencyHint: 0`
- [ ] Smooth 10ms hops
- [ ] **No underruns**

## ✅ Pitch Quality
- [ ] Held vowel: **<5% octave error**
- [ ] Lock-in **<~50ms**
- [ ] Glide trace smooth

## ✅ Phrase Feedback
- [ ] "How are you doing?" → **DTW tier** returns friendly 3–5 level
- [ ] **End-rise** success fires on genuine rise

## ✅ Golden Path Flow & Privacy
- [ ] Onboarding → Warmup → Glide → Phrase → Reflection completes **offline**
- [ ] Session summary saved to IndexedDB
- [ ] **Export JSON** works
- [ ] **Delete all** works

## ✅ Device-Change Resilience
- [ ] Unplug USB mic → toast + re-init
- [ ] Switch to BT → toast + re-init
- [ ] Change default device → toast + re-init
- [ ] Sample-rate change handled without artifacts

## ✅ A11y (Firefox + NVDA)
- [ ] Keyboard only path completes
- [ ] Canvas feedback mirrored to **ARIA live (polite)**
- [ ] Controls have name/role/value
- [ ] Visible focus

## ✅ Automated Tests Pass
- [ ] `pnpm test` - Cross-origin isolation online/offline
- [ ] `pnpm test` - Flow JSON v1 schema validation
- [ ] Self-test suite: Lock-in <100ms, Octave error <0.5st, GPE <5%

## ✅ Service Worker
- [ ] COOP/COEP headers preserved offline
- [ ] Cross-origin isolation maintained from cache
- [ ] WASM threads remain enabled offline

## ✅ Performance
- [ ] CREPE-tiny loads with SIMD+threads when isolated
- [ ] YIN fallback works when ONNX unavailable
- [ ] No memory leaks in 12-minute session
- [ ] Smooth 60fps UI updates

## ✅ Windows 11 + Firefox Specific
- [ ] Audio enhancements guidance displayed
- [ ] Headphone recommendations shown
- [ ] Clean signal path verified

---

**Go Criteria:** All items checked ✅
**No-Go:** Any critical items failing ❌

**Last Updated:** $(date)
**Tested On:** Windows 11 + Firefox
