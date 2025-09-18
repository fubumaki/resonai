# OTel Integration Branch

This branch (`otel-integration`) is used for integrating Resonai with the OpenTelemetry observability stack.

## Purpose
- Local development and testing of Resonai within the OTel workspace
- Integration with Windows Event Log collection and SigNoz observability
- Real-time telemetry from voice training sessions

## Usage
This submodule is managed from the parent OTel repository. Changes here should be:
1. Tested locally with the OTel collector
2. Committed to this branch
3. Updated in the parent repository

## Integration Points
- Audio processing metrics → OTel collector
- Session data → SigNoz dashboards  
- Error tracking → Windows Event Logs
- Performance monitoring → OTLP traces

## Development
Run from the parent OTel directory:
```powershell
cd third_party\resonai
pnpm install
pnpm run dev
```

The dev server will be available at `http://localhost:3000` and can send telemetry to the OTel collector on `http://localhost:5318`.
