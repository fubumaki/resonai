// Analytics events for Practice HUD
import { trackEvent } from './core';

export interface HUDAnalytics {
  // HUD visibility events
  hudShown: (source: 'recording_started') => void;
  hudHidden: (source: 'recording_stopped' | 'session_end') => void;
  
  // Performance tracking
  hudPerformanceMetrics: (metrics: {
    avgFrameRate: number;
    cpuUsage?: number;
    memoryUsage?: number;
    updateLatency: number;
  }) => void;
  
  // User interaction events
  hudInteraction: (interaction: 'viewed' | 'focused' | 'ignored') => void;
  
  // Metrics tracking
  metricsThresholds: (thresholds: {
    pitchMin: number;
    pitchMax: number;
    brightnessMin: number;
    brightnessMax: number;
  }) => void;
  
  // Session analytics
  practiceSessionMetrics: (session: {
    duration: number;
    avgPitch: number | null;
    avgBrightness: number;
    avgConfidence: number;
    inRangePercentage: number;
    calibrationUsed: boolean;
  }) => void;
  
  // Error tracking
  hudError: (error: string, component: string) => void;
  audioProcessingError: (error: string) => void;
}

export const hudAnalytics: HUDAnalytics = {
  hudShown: (source) => {
    trackEvent('hud_shown', {
      source,
      timestamp: Date.now(),
      has_calibration: !!localStorage.getItem('mic-calibration-config'),
    });
  },

  hudHidden: (source) => {
    trackEvent('hud_hidden', {
      source,
      timestamp: Date.now(),
    });
  },

  hudPerformanceMetrics: (metrics) => {
    trackEvent('hud_performance_metrics', {
      avg_frame_rate: metrics.avgFrameRate,
      cpu_usage: metrics.cpuUsage,
      memory_usage: metrics.memoryUsage,
      update_latency_ms: metrics.updateLatency,
      timestamp: Date.now(),
    });
  },

  hudInteraction: (interaction) => {
    trackEvent('hud_interaction', {
      interaction,
      timestamp: Date.now(),
    });
  },

  metricsThresholds: (thresholds) => {
    trackEvent('hud_metrics_thresholds', {
      pitch_min_hz: thresholds.pitchMin,
      pitch_max_hz: thresholds.pitchMax,
      brightness_min: thresholds.brightnessMin,
      brightness_max: thresholds.brightnessMax,
      timestamp: Date.now(),
    });
  },

  practiceSessionMetrics: (session) => {
    trackEvent('practice_session_metrics', {
      duration_ms: session.duration,
      avg_pitch_hz: session.avgPitch,
      avg_brightness: session.avgBrightness,
      avg_confidence: session.avgConfidence,
      in_range_percentage: session.inRangePercentage,
      calibration_used: session.calibrationUsed,
      timestamp: Date.now(),
    });
  },

  hudError: (error, component) => {
    trackEvent('hud_error', {
      error_message: error,
      component,
      timestamp: Date.now(),
    });
  },

  audioProcessingError: (error) => {
    trackEvent('audio_processing_error', {
      error_message: error,
      timestamp: Date.now(),
    });
  },
};
