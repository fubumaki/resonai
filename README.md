# Resonai

A local-first voice feminization trainer with real-time feedback. Private, secure, and runs entirely in your browser.

## Features

- **Real-time pitch & brightness analysis** using AudioWorklet
- **Profile presets** (Alto, Mezzo, Soprano, Custom) with target zones
- **Guided phrase trials** with instant scoring
- **Session summaries** with charts and data export
- **Device management** with fallback handling
- **PWA support** with offline capabilities
- **Strict CSP** security with no inline styles
- **Local-first** - no audio uploads, no cloud storage

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run tests
pnpm run test:e2e

# Build for production
pnpm run build

# Run codemod to clean up inline styles
./scripts/run-codemod.ps1  # Windows
./scripts/run-codemod.sh   # Unix
```

## Security

This app uses strict Content Security Policy (CSP) with no `unsafe-inline` styles. All UI components use CSS classes or SVG attributes for styling.

## Architecture

- **Next.js 14** with App Router
- **AudioWorklet** for real-time audio processing
- **IndexedDB** (via Dexie) for local persistence
- **Playwright** for E2E testing
- **PWA** with service worker caching

## License

MIT