'use client';

import React, { useId } from 'react';
import { PracticeMetrics, TargetRanges } from '../hooks/usePracticeMetrics';

interface PracticeHUDProps {
  metrics: PracticeMetrics;
  targetRanges?: TargetRanges;
  isVisible?: boolean;
  className?: string;
}

export default function PracticeHUD({
  metrics,
  targetRanges,
  isVisible = true,
  className = ''
}: PracticeHUDProps) {
  const inRangeGradientId = useId();

  if (!isVisible) return null;

  const defaultTargetRanges: TargetRanges = {
    pitchMin: 200,
    pitchMax: 400,
    brightnessMin: 0.3,
    brightnessMax: 0.7,
  };

  const ranges = targetRanges || defaultTargetRanges;

  // Helper functions for visual indicators
  const getPitchStatus = (pitch: number | null) => {
    if (pitch === null) return 'no-signal';
    if (pitch < ranges.pitchMin) return 'low';
    if (pitch > ranges.pitchMax) return 'high';
    return 'in-range';
  };

  const getBrightnessStatus = (brightness: number) => {
    if (brightness < ranges.brightnessMin) return 'low';
    if (brightness > ranges.brightnessMax) return 'high';
    return 'in-range';
  };

  const getConfidenceStatus = (confidence: number) => {
    if (confidence < 0.3) return 'low';
    if (confidence < 0.7) return 'medium';
    return 'high';
  };

  const formatPitch = (pitch: number | null) => {
    if (pitch === null) return '-- Hz';
    return `${Math.round(pitch)} Hz`;
  };

  const formatBrightness = (brightness: number) => {
    return `${Math.round(brightness * 100)}%`;
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const formatInRange = (percentage: number) => {
    return `${Math.round(percentage)}%`;
  };

  const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));
  const pitchIndicatorPosition = metrics.pitch === null
    ? null
    : clampPercentage(((metrics.pitch - 100) / 500) * 100);
  const brightnessPercent = clampPercentage(metrics.brightness * 100);
  const confidencePercent = clampPercentage(metrics.confidence * 100);
  const inRangePercent = clampPercentage(metrics.inRangePercentage);

  return (
    <div
      className={`practice-hud bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Practice metrics"
    >
      <div className="grid grid-cols-2 gap-4">
        {/* Pitch Display */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Pitch
            </span>
            <span 
              className="text-lg font-mono font-semibold"
              aria-label={`Current pitch: ${formatPitch(metrics.pitch)}`}
            >
              {formatPitch(metrics.pitch)}
            </span>
          </div>
          
          {/* Pitch Range Indicator */}
          <div className="h-2" aria-hidden="true">
            <svg
              className="practice-meter-svg"
              viewBox="0 0 100 4"
              preserveAspectRatio="none"
            >
              <rect className="practice-meter-track" x="0" y="0" width="100" height="4" rx="2" />
              <rect className="practice-pitch-segment practice-pitch-segment--low" x="0" y="0" width="30" height="4" rx="2" />
              <rect className="practice-pitch-segment practice-pitch-segment--target" x="30" y="0" width="40" height="4" />
              <rect className="practice-pitch-segment practice-pitch-segment--high" x="70" y="0" width="30" height="4" rx="2" />
              {pitchIndicatorPosition !== null && (
                <line
                  className="practice-pitch-indicator"
                  x1={pitchIndicatorPosition}
                  x2={pitchIndicatorPosition}
                  y1={0}
                  y2={4}
                />
              )}
            </svg>
          </div>

          {/* Status indicator */}
          <div className="flex items-center mt-1">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                getPitchStatus(metrics.pitch) === 'in-range' ? 'bg-green-500' :
                getPitchStatus(metrics.pitch) === 'low' ? 'bg-red-500' :
                getPitchStatus(metrics.pitch) === 'high' ? 'bg-red-500' :
                'bg-gray-400'
              }`}
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {getPitchStatus(metrics.pitch) === 'in-range' ? 'In range' :
               getPitchStatus(metrics.pitch) === 'low' ? 'Too low' :
               getPitchStatus(metrics.pitch) === 'high' ? 'Too high' :
               'No signal'}
            </span>
          </div>
        </div>

        {/* Brightness Display */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Brightness
            </span>
            <span 
              className="text-sm font-mono font-semibold"
              aria-label={`Current brightness: ${formatBrightness(metrics.brightness)}`}
            >
              {formatBrightness(metrics.brightness)}
            </span>
          </div>
          
          {/* Brightness Meter */}
          <div className="h-8" aria-label={`Brightness level: ${formatBrightness(metrics.brightness)}`}>
            <svg
              className="practice-meter-svg"
              viewBox="0 0 100 16"
              preserveAspectRatio="none"
            >
              <rect className="practice-meter-track" x="0" y="0" width="100" height="16" rx="8" />
              <rect
                className={`practice-meter-fill ${
                  getBrightnessStatus(metrics.brightness) === 'in-range' ? 'practice-meter-fill--good' :
                  getBrightnessStatus(metrics.brightness) === 'low' ? 'practice-meter-fill--warn' :
                  'practice-meter-fill--alert'
                }`}
                x="0"
                y="0"
                height="16"
                rx="8"
                width={brightnessPercent}
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Confidence Display */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Confidence
            </span>
            <span 
              className="text-sm font-mono font-semibold"
              aria-label={`Analysis confidence: ${formatConfidence(metrics.confidence)}`}
            >
              {formatConfidence(metrics.confidence)}
            </span>
          </div>
          
          {/* Confidence Meter */}
          <div className="h-8" aria-label={`Confidence level: ${formatConfidence(metrics.confidence)}`}>
            <svg
              className="practice-meter-svg"
              viewBox="0 0 100 16"
              preserveAspectRatio="none"
            >
              <rect className="practice-meter-track" x="0" y="0" width="100" height="16" rx="8" />
              <rect
                className={`practice-meter-fill ${
                  getConfidenceStatus(metrics.confidence) === 'high' ? 'practice-meter-fill--info' :
                  getConfidenceStatus(metrics.confidence) === 'medium' ? 'practice-meter-fill--warn' :
                  'practice-meter-fill--alert'
                }`}
                x="0"
                y="0"
                height="16"
                rx="8"
                width={confidencePercent}
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* In-Range Percentage */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              In Range
            </span>
            <span 
              className="text-lg font-mono font-semibold"
              aria-label={`Time in range: ${formatInRange(metrics.inRangePercentage)}`}
            >
              {formatInRange(metrics.inRangePercentage)}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-3" aria-label={`Progress: ${formatInRange(metrics.inRangePercentage)} in range`}>
            <svg
              className="practice-meter-svg"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={inRangeGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="50%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <rect className="practice-meter-track" x="0" y="0" width="100" height="12" rx="6" />
              <rect
                className="practice-meter-gradient-fill"
                x="0"
                y="0"
                height="12"
                rx="6"
                width={inRangePercent}
                fill={`url(#${inRangeGradientId})`}
              />
            </svg>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Last 10 seconds
          </div>
        </div>
      </div>

      {/* Target Ranges Display */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Target: {ranges.pitchMin}-{ranges.pitchMax} Hz, {Math.round(ranges.brightnessMin * 100)}-{Math.round(ranges.brightnessMax * 100)}% brightness
        </div>
      </div>
    </div>
  );
}
