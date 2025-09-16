import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MicCalibrationFlow from '../../../components/MicCalibrationFlow';
import { deviceManager } from '../../../audio/deviceManager';

// Mock the device manager
vi.mock('../../../audio/deviceManager', () => ({
  deviceManager: {
    checkDeviceStatus: vi.fn()
  }
}));

// Mock MediaDevices API
const mockEnumerateDevices = vi.fn();
const mockGetUserMedia = vi.fn();

Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    enumerateDevices: mockEnumerateDevices,
    getUserMedia: mockGetUserMedia,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
});

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createMediaStreamSource: vi.fn().mockReturnValue({
    connect: vi.fn()
  }),
  createAnalyser: vi.fn().mockReturnValue({
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn()
  }),
  close: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('MicCalibrationFlow', () => {
  const mockOnComplete = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockEnumerateDevices.mockResolvedValue([
      {
        deviceId: 'device1',
        label: 'USB Microphone',
        kind: 'audioinput'
      },
      {
        deviceId: 'device2',
        label: 'Built-in Microphone',
        kind: 'audioinput'
      }
    ]);

    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ 
        stop: vi.fn(),
        getSettings: () => ({ deviceId: 'device1' })
      }]
    });

    vi.mocked(deviceManager.checkDeviceStatus).mockResolvedValue({
      hasAudio: true,
      deviceCount: 2
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders device selection step initially', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    expect(screen.getByText('Step 1: Select Microphone')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Choose your microphone:')).toBeInTheDocument();
      expect(screen.getByDisplayValue('USB Microphone')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Built-in Microphone')).toBeInTheDocument();
    });
  });

  it('shows error when no devices are available', async () => {
    vi.mocked(deviceManager.checkDeviceStatus).mockResolvedValue({
      hasAudio: false,
      deviceCount: 0
    });

    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(screen.getByText('No audio input devices found')).toBeInTheDocument();
    });
  });

  it('auto-selects first device when none selected', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const select = screen.getByLabelText('Microphone selection');
      expect(select).toHaveValue('device1');
    });
  });

  it('enables test button when device is selected', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      expect(testButton).not.toBeDisabled();
    });
  });

  it('disables test button when no device is selected', async () => {
    mockEnumerateDevices.mockResolvedValue([]);

    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      expect(testButton).toBeDisabled();
    });
  });

  it('proceeds to level calibration when test microphone is clicked', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      expect(testButton).not.toBeDisabled();
    });

    const testButton = screen.getByText('Test Microphone');
    fireEvent.click(testButton);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(screen.getByText('Step 2: Level Calibration')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error when getUserMedia fails', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/Could not access microphone/)).toBeInTheDocument();
    });
  });

  it('proceeds to environment test when continue is clicked', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Go to level calibration step
    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Step 3: Environment Test')).toBeInTheDocument();
      expect(screen.getByText('Speak normally to test your microphone setup:')).toBeInTheDocument();
    });
  });

  it('completes calibration and calls onComplete with config', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Go through all steps
    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);
    });

    await waitFor(() => {
      const completeButton = screen.getByText('Complete Setup');
      fireEvent.click(completeButton);
    });

    expect(mockOnComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: 'device1',
        constraints: expect.objectContaining({
          deviceId: { exact: 'device1' },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }),
        levelSettings: expect.objectContaining({
          gain: expect.any(Number),
          noiseFloor: expect.any(Number)
        })
      })
    );
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('retests microphone when retest button is clicked', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Go to level calibration step
    await waitFor(() => {
      const testButton = screen.getByText('Test Microphone');
      fireEvent.click(testButton);
    });

    await waitFor(() => {
      const retestButton = screen.getByText('Retest Mic');
      fireEvent.click(retestButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Step 1: Select Microphone')).toBeInTheDocument();
    });
  });
});
