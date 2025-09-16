import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMicCalibration } from '../../../hooks/useMicCalibration';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('useMicCalibration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with no configuration', () => {
    const { result } = renderHook(() => useMicCalibration());

    expect(result.current.config).toBeNull();
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads saved configuration from localStorage', () => {
    const savedConfig = {
      deviceId: 'device1',
      constraints: {
        deviceId: { exact: 'device1' },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      levelSettings: {
        gain: 50,
        noiseFloor: 10
      }
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedConfig));

    const { result } = renderHook(() => useMicCalibration());

    expect(result.current.config).toEqual(savedConfig);
    expect(result.current.isConfigured).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles invalid saved configuration gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useMicCalibration());

    expect(result.current.config).toBeNull();
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Failed to load microphone configuration');
  });

  it('saves configuration to localStorage', () => {
    // Reset localStorage mock for this test
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    const { result } = renderHook(() => useMicCalibration());

    const config = {
      deviceId: 'device1',
      constraints: {
        deviceId: { exact: 'device1' },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      levelSettings: {
        gain: 50,
        noiseFloor: 10
      }
    };

    act(() => {
      result.current.saveConfig(config);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'mic-calibration-config',
      JSON.stringify(config)
    );
    expect(result.current.config).toEqual(config);
    expect(result.current.isConfigured).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handles save errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useMicCalibration());

    const config = {
      deviceId: 'device1',
      constraints: {},
      levelSettings: { gain: 50, noiseFloor: 10 }
    };

    act(() => {
      result.current.saveConfig(config);
    });

    expect(result.current.error).toBe('Failed to save microphone configuration');
  });

  it('clears configuration from localStorage', () => {
    const { result } = renderHook(() => useMicCalibration());

    act(() => {
      result.current.clearConfig();
    });

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mic-calibration-config');
    expect(result.current.config).toBeNull();
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles clear errors gracefully', () => {
    mockLocalStorage.removeItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    const { result } = renderHook(() => useMicCalibration());

    act(() => {
      result.current.clearConfig();
    });

    expect(result.current.error).toBe('Failed to clear microphone configuration');
  });

  it('resets configuration for retesting', () => {
    // Reset localStorage mock for this test
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    const { result } = renderHook(() => useMicCalibration());

    // First save a config
    const config = {
      deviceId: 'device1',
      constraints: {},
      levelSettings: { gain: 50, noiseFloor: 10 }
    };

    act(() => {
      result.current.saveConfig(config);
    });

    expect(result.current.isConfigured).toBe(true);

    // Then retest
    act(() => {
      result.current.retestMic();
    });

    expect(result.current.isConfigured).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns default media constraints when no config', () => {
    const { result } = renderHook(() => useMicCalibration());

    const constraints = result.current.getMediaConstraints();

    expect(constraints).toEqual({ audio: true });
  });

  it('returns configured media constraints when config exists', () => {
    // Reset localStorage mock for this test
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    const { result } = renderHook(() => useMicCalibration());

    const config = {
      deviceId: 'device1',
      constraints: {
        deviceId: { exact: 'device1' },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      levelSettings: {
        gain: 50,
        noiseFloor: 10
      }
    };

    act(() => {
      result.current.saveConfig(config);
    });

    const constraints = result.current.getMediaConstraints();

    expect(constraints).toEqual({
      audio: {
        deviceId: { exact: 'device1' },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  });

  it('returns constraints without deviceId when deviceId is null', () => {
    // Reset localStorage mock for this test
    mockLocalStorage.setItem.mockImplementation(() => {});
    
    const { result } = renderHook(() => useMicCalibration());

    const config = {
      deviceId: null,
      constraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      levelSettings: {
        gain: 50,
        noiseFloor: 10
      }
    };

    act(() => {
      result.current.saveConfig(config);
    });

    const constraints = result.current.getMediaConstraints();

    expect(constraints).toEqual({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  });
});
