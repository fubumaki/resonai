import { useState, useEffect, useCallback } from 'react';

interface MicCalibrationConfig {
  deviceId: string | null;
  constraints: MediaTrackConstraints;
  levelSettings: {
    gain: number;
    noiseFloor: number;
  };
}

interface MicCalibrationState {
  config: MicCalibrationConfig | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

const CALIBRATION_STORAGE_KEY = 'mic-calibration-config';

export function useMicCalibration() {
  const [state, setState] = useState<MicCalibrationState>({
    config: null,
    isConfigured: false,
    isLoading: true,
    error: null
  });

  // Load saved configuration on mount
  useEffect(() => {
    const loadSavedConfig = () => {
      try {
        const saved = localStorage.getItem(CALIBRATION_STORAGE_KEY);
        if (saved) {
          const config = JSON.parse(saved) as MicCalibrationConfig;
          setState(prev => ({
            ...prev,
            config,
            isConfigured: true,
            isLoading: false
          }));
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      } catch (error) {
        console.error('Failed to load mic calibration config:', error);
        setState(prev => ({
          ...prev,
          error: 'Failed to load microphone configuration',
          isLoading: false
        }));
      }
    };

    loadSavedConfig();
  }, []);

  const saveConfig = useCallback((config: MicCalibrationConfig) => {
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(config));
      setState(prev => ({
        ...prev,
        config,
        isConfigured: true,
        error: null
      }));
    } catch (error) {
      console.error('Failed to save mic calibration config:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to save microphone configuration'
      }));
    }
  }, []);

  const clearConfig = useCallback(() => {
    try {
      localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      setState(prev => ({
        ...prev,
        config: null,
        isConfigured: false,
        error: null
      }));
    } catch (error) {
      console.error('Failed to clear mic calibration config:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to clear microphone configuration'
      }));
    }
  }, []);

  const retestMic = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConfigured: false,
      error: null
    }));
  }, []);

  const getMediaConstraints = useCallback((): MediaStreamConstraints => {
    if (!state.config) {
      return { audio: true };
    }

    return {
      audio: {
        ...state.config.constraints,
        deviceId: state.config.deviceId ? { exact: state.config.deviceId } : undefined
      }
    };
  }, [state.config]);

  return {
    ...state,
    saveConfig,
    clearConfig,
    retestMic,
    getMediaConstraints
  };
}
