# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2024-12-19 - Windows 11 + Firefox Launch

### Added
- **CI/CD Pipeline**: GitHub Actions with Firefox Playwright tests for isolation and flow validation
- **Service Worker v2**: Pre-cache critical assets (ONNX, worklets) with COOP/COEP header preservation
- **Runtime Isolation Guard**: Graceful fallback to YIN when cross-origin isolation unavailable
- **Session Export/Import**: Zod-validated v1 schema for privacy-safe session data management
- **Environment Report**: `/dev/env` page for system diagnostics and troubleshooting
- **Enhanced Build Pipeline**: Automated precache management with asset discovery
- **Flow JSON Schema Validation**: Runtime validation with detailed error reporting
- **Comprehensive A11y**: ARIA live regions, keyboard navigation, screen reader support
- **Privacy Documentation**: Complete About page with local-first policy and technical details

### Enhanced
- **Pitch Self-Test Harness**: Lock-in time measurement, octave error validation, GPE tracking
- **Service Worker**: Dynamic asset discovery and cache management
- **Build Process**: Prebuild hooks with automated precache updates
- **Error Handling**: Detailed validation errors with field-specific messages

### Fixed
- **Cross-origin Isolation**: SW preserves headers offline for WASM threads/SIMD
- **Device Change Resilience**: Automatic recovery from audio device switches
- **Type Safety**: Replaced `any` types with precise TypeScript definitions
- **Build Errors**: Resolved duplicate function definitions and dependency ordering

### Security
- **Local-First**: No audio or metrics leave device, IndexedDB-only storage
- **Privacy Controls**: Export/Delete functionality works fully offline
- **Data Validation**: Zod schemas prevent malformed data imports

### Performance
- **CREPE-tiny**: ONNX Runtime Web with SIMD+threads when isolated
- **YIN Fallback**: Single-threaded fallback when isolation unavailable
- **Low Latency**: <100ms visual feedback, <50ms pitch lock-in
- **Stability**: 12-minute continuous capture without underruns

### Documentation
- **SLOs & Budgets**: Performance targets and ship-gate criteria
- **Troubleshooting**: Environment report with fix recommendations
- **Setup Guidance**: Windows mic enhancement disable instructions
- **API Documentation**: Complete TypeScript interfaces and schemas

## [1.0.0] - 2024-12-18 - Initial Release

### Added
- **Golden Path Flow**: JSON-driven practice sessions (onboarding → warmup → glide → phrase → reflection)
- **PitchEngine**: CREPE-tiny + YIN detector with median/Kalman smoothing
- **Real-time Visualization**: Live pitch ribbon with smooth updates
- **Prosody Analysis**: End-rise detection and expressiveness metrics
- **Local Storage**: IndexedDB session summaries with export/delete
- **Safety Features**: Loudness monitoring and cooldown prompts
- **Cross-origin Isolation**: COOP/COEP headers for WASM performance
- **Device Management**: Audio device change detection and recovery

### Technical Stack
- **Frontend**: Next.js 15 with React 18, TypeScript
- **Audio**: Web Audio API with ScriptProcessorNode
- **ML**: ONNX Runtime Web for CREPE-tiny pitch detection
- **Storage**: IndexedDB with idb library for local-first data
- **Testing**: Playwright E2E tests, Vitest unit tests
- **Styling**: Tailwind CSS with responsive design

---

**Format**: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
**Versioning**: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
