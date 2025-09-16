// Analytics events for microphone calibration flow
import { trackEvent } from './core';

export interface CalibrationAnalytics {
  // Calibration flow events
  calibrationStarted: () => void;
  calibrationStepCompleted: (step: 'device' | 'level' | 'environment') => void;
  calibrationCompleted: (config: {
    deviceId: string | null;
    hasConstraints: boolean;
    duration: number;
  }) => void;
  calibrationCancelled: (step: 'device' | 'level' | 'environment') => void;
  
  // Device selection events
  deviceSelected: (deviceInfo: {
    deviceId: string;
    label: string;
    isDefault: boolean;
  }) => void;
  deviceTestAttempted: (deviceId: string, success: boolean) => void;
  
  // Error tracking
  calibrationError: (error: string, step: string) => void;
  getUserMediaError: (error: string) => void;
  
  // Recalibration events
  recalibrationTriggered: (source: 'settings' | 'main_ui' | 'error') => void;
  calibrationCleared: () => void;
}

export const calibrationAnalytics: CalibrationAnalytics = {
  calibrationStarted: () => {
    trackEvent('calibration_started', {
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      has_calibration_config: !!localStorage.getItem('mic-calibration-config'),
    });
  },

  calibrationStepCompleted: (step) => {
    trackEvent('calibration_step_completed', {
      step,
      timestamp: Date.now(),
    });
  },

  calibrationCompleted: (config) => {
    trackEvent('calibration_completed', {
      device_id: config.deviceId,
      has_constraints: config.hasConstraints,
      duration_ms: config.duration,
      timestamp: Date.now(),
    });
  },

  calibrationCancelled: (step) => {
    trackEvent('calibration_cancelled', {
      step,
      timestamp: Date.now(),
    });
  },

  deviceSelected: (deviceInfo) => {
    trackEvent('calibration_device_selected', {
      device_id: deviceInfo.deviceId,
      device_label: deviceInfo.label,
      is_default: deviceInfo.isDefault,
      timestamp: Date.now(),
    });
  },

  deviceTestAttempted: (deviceId, success) => {
    trackEvent('calibration_device_test_attempted', {
      device_id: deviceId,
      success,
      timestamp: Date.now(),
    });
  },

  calibrationError: (error, step) => {
    trackEvent('calibration_error', {
      error_message: error,
      step,
      timestamp: Date.now(),
    });
  },

  getUserMediaError: (error) => {
    trackEvent('getUserMedia_error', {
      error_message: error,
      timestamp: Date.now(),
    });
  },

  recalibrationTriggered: (source) => {
    trackEvent('recalibration_triggered', {
      source,
      timestamp: Date.now(),
    });
  },

  calibrationCleared: () => {
    trackEvent('calibration_cleared', {
      timestamp: Date.now(),
    });
  },
};
