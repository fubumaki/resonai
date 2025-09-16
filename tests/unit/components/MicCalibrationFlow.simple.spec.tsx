import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

describe('MicCalibrationFlow - Basic Functionality', () => {
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
      deviceCount: 1
    });
  });

  it('renders the initial device selection step', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    expect(screen.getByText('Step 1: Select Microphone')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Test Microphone')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows error when no audio devices are available', async () => {
    vi.mocked(deviceManager.checkDeviceStatus).mockResolvedValue({
      hasAudio: false,
      deviceCount: 0
    });

    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Wait for the error to appear
    await screen.findByText('No audio input devices found');
    expect(screen.getByText('No audio input devices found')).toBeInTheDocument();
  });

  it('disables test button when no device is selected', async () => {
    mockEnumerateDevices.mockResolvedValue([]);

    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    const testButton = screen.getByText('Test Microphone');
    expect(testButton).toBeDisabled();
  });

  it('shows device options when devices are available', async () => {
    render(<MicCalibrationFlow onComplete={mockOnComplete} onCancel={mockOnCancel} />);

    // Wait for devices to load
    await screen.findByText('Choose your microphone:');
    
    expect(screen.getByDisplayValue('USB Microphone')).toBeInTheDocument();
  });
});
