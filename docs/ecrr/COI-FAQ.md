# COI FAQ

## Why enforce COOP/COEP?
SharedArrayBuffer, WASM threads/SIMD, and WebGPU on Firefox require both headers on every navigation and worker response.

## What breaks under COEP?
Any third-party asset without CORS or CORP. Self-host fonts/models or configure CORS responses.

## How do we stay isolated offline?
`public/coi-keepalive-sw.js` reissues navigation responses with COOP/COEP. It installs after the first COI load to avoid first-paint issues.

## How do we verify?
Run `scripts/ecrr/verify-headers.ps1` or `curl -I http://localhost:3003/` and `curl -I http://localhost:3003/worker.js`. Headers must include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`.

## What about ONNX runtime?
ONNX threading is gated on `window.crossOriginIsolated === true`. When false, falls back to single-threaded execution.

## Mic constraints under COI?
Firefox requires echoCancellation, noiseSuppression, and autoGainControl all set to false for raw audio capture under COI.

## Service Worker behavior?
SW only intercepts navigation requests (document/worker), not API calls. Preserves COOP/COEP headers in cached responses.

## Troubleshooting COEP violations
1. Check browser console for CORP errors
2. Verify third-party assets have proper CORS headers
3. Self-host critical resources if CORS not available
4. Use `scripts/ecrr/verify-headers.ps1` to confirm header presence

## Firefox-specific considerations
- Requires Firefox ≥141 for full COI support
- WebGPU and SharedArrayBuffer only available under COI
- AudioWorklet requires COI for multi-threading
- Service Worker must preserve headers for offline continuity
