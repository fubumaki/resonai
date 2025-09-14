// src/engine/audio/mockTelemetry.ts
// Mock telemetry generator for development and testing

// Mock telemetry generator for development and testing

export interface TelemetryFrame {
  t: number;           // ms since stream start
  f0Hz: number | null; // null for unvoiced
}

export interface MockTelemetryOptions {
  pattern: 'rising' | 'falling' | 'flat' | 'question' | 'random';
  baseHz?: number;
  duration?: number; // ms
  updateRate?: number; // ms between updates
}

export function generateMockTelemetry(
  options: MockTelemetryOptions = { pattern: 'random' }
): TelemetryFrame[] {
  const {
    pattern = 'random',
    baseHz = 200,
    duration = 2000,
    updateRate = 50
  } = options;

  const frames: TelemetryFrame[] = [];
  const numFrames = Math.floor(duration / updateRate);

  for (let i = 0; i < numFrames; i++) {
    const t = i * updateRate;
    let f0Hz: number | null;

    switch (pattern) {
      case 'rising':
        // Linear rise from baseHz to baseHz + 50
        f0Hz = baseHz + (50 * i) / (numFrames - 1);
        break;
      
      case 'falling':
        // Linear fall from baseHz + 50 to baseHz
        f0Hz = baseHz + 50 - (50 * i) / (numFrames - 1);
        break;
      
      case 'flat':
        // Constant with small noise
        f0Hz = baseHz + (Math.random() - 0.5) * 10;
        break;
      
      case 'question':
        // Rising intonation pattern (question-like)
        if (i < numFrames * 0.7) {
          f0Hz = baseHz + (Math.random() - 0.5) * 5; // flat start
        } else {
          const riseProgress = (i - numFrames * 0.7) / (numFrames * 0.3);
          f0Hz = baseHz + riseProgress * 60; // strong rise at end
        }
        break;
      
      case 'random':
      default:
        // Random with some unvoiced periods
        if (Math.random() < 0.2) {
          f0Hz = null; // unvoiced
        } else {
          f0Hz = baseHz + (Math.random() - 0.5) * 40;
        }
        break;
    }

    frames.push({ t, f0Hz });
  }

  return frames;
}

// Utility to create a streaming mock for real-time simulation
export function createStreamingMock(
  callback: (frame: TelemetryFrame) => void,
  options: MockTelemetryOptions = { pattern: 'random' }
): () => void {
  const { pattern = 'random', baseHz = 200, updateRate = 50 } = options;
  let frameIndex = 0;
  
  const interval = setInterval(() => {
    const frame = generateMockTelemetry({ ...options, duration: updateRate })[0];
    frame.t = Date.now();
    callback(frame);
    frameIndex++;
  }, updateRate);

  return () => clearInterval(interval);
}
