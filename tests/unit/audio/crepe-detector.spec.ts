import { describe, expect, it, vi } from 'vitest';
import CrepeTinyDetector from '@/audio/detectors/CrepeTinyDetector';

describe('CrepeTinyDetector', () => {
  it('maps model IO names and returns pitch/confidence', async () => {
    class MockTensor {
      data: Float32Array;
      constructor(_: string, data: Float32Array) {
        this.data = data;
      }
    }

    const mockRun = vi.fn(() => ({
      output_frequency: { data: new Float32Array([220]) },
      output_confidence: { data: new Float32Array([0.9]) },
    }));

    const mockSession = {
      inputNames: ['input_audio'],
      outputNames: ['output_frequency', 'output_confidence'],
      run: mockRun,
    };

    const mockOrt = {
      env: { wasm: {} },
      Tensor: MockTensor,
      InferenceSession: {
        create: vi.fn().mockResolvedValue(mockSession),
      },
    };

    const detector = new CrepeTinyDetector();
    await detector.initialize({ onnx: mockOrt, modelUrl: 'mock-model.onnx' });

    const frame = new Float32Array(1024);
    const result = detector.processFrame(frame, 16000);

    expect(result.pitchHz).toBe(220);
    expect(result.confidence).toBeCloseTo(0.9, 5);
    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ input_audio: expect.any(MockTensor) }),
      expect.arrayContaining(['output_frequency', 'output_confidence'])
    );
  });
});
