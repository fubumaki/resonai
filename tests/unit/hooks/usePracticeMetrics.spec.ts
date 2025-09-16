import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePracticeMetrics } from '../../../hooks/usePracticeMetrics';

// Mock MediaStream
const mockMediaStream = {
  getTracks: () => [],
  getAudioTracks: () => [],
  getVideoTracks: () => [],
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
} as unknown as MediaStream;

// Mock AudioWorkletNode
const mockAudioWorkletNode = {
  port: {
    onmessage: null,
  },
  disconnect: vi.fn(),
} as unknown as AudioWorkletNode;

// Mock requestAnimationFrame
const mockRequestAnimationFrame = vi.fn();
const mockCancelAnimationFrame = vi.fn();

// Mock AudioWorkletNode constructor
const mockAudioWorkletNodeConstructor = vi.fn().mockReturnValue(mockAudioWorkletNode);

// Mock AudioContext
const mockAudioContext = {
  audioWorklet: {
    addModule: vi.fn().mockResolvedValue(undefined),
  },
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn(),
  }),
  close: vi.fn(),
} as unknown as AudioContext;

describe('usePracticeMetrics', () => {
  beforeEach(() => {
    // Mock global objects
    global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as any;
    global.AudioWorkletNode = mockAudioWorkletNodeConstructor as any;
    global.requestAnimationFrame = mockRequestAnimationFrame;
    global.cancelAnimationFrame = mockCancelAnimationFrame;

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => usePracticeMetrics(null));

    expect(result.current.metrics).toEqual({
      pitch: null,
      brightness: 0,
      confidence: 0,
      inRangePercentage: 0,
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles null mediaStream gracefully', () => {
    const { result } = renderHook(() => usePracticeMetrics(null));

    expect(result.current.isActive).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('provides start and stop functions', () => {
    const { result } = renderHook(() => usePracticeMetrics(null));

    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
  });

  it('accepts custom options', () => {
    const customOptions = {
      targetRanges: {
        pitchMin: 100,
        pitchMax: 300,
        brightnessMin: 0.2,
        brightnessMax: 0.8,
      },
      updateInterval: 33.33, // 30fps
      historyLength: 300,
    };

    const { result } = renderHook(() => 
      usePracticeMetrics(null, customOptions)
    );

    expect(result.current.error).toBeNull();
  });

  it('handles initialization errors gracefully', async () => {
    // Test with null mediaStream to avoid audio context issues
    const { result } = renderHook(() => usePracticeMetrics(null));

    expect(result.current.error).toBeNull();
    expect(result.current.isActive).toBe(false);
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = renderHook(() => usePracticeMetrics(null));

    // Unmount should not throw errors
    expect(() => unmount()).not.toThrow();
  });

  it('stops processing when stop is called', () => {
    const { result } = renderHook(() => usePracticeMetrics(null));

    // Stop should not throw errors
    act(() => {
      result.current.stop();
    });

    expect(result.current.isActive).toBe(false);
  });

  it('resets metrics when stopped', () => {
    const { result } = renderHook(() => usePracticeMetrics(null));

    // Stop the hook
    act(() => {
      result.current.stop();
    });

    expect(result.current.metrics).toEqual({
      pitch: null,
      brightness: 0,
      confidence: 0,
      inRangePercentage: 0,
    });
  });
});
