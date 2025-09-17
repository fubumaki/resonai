'use client';

/* eslint-disable no-restricted-syntax */
import React from 'react';
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
          <div className="relative h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="absolute inset-0 flex">
              {/* Low range indicator */}
              <div
                className="bg-red-400 h-full width-30"
                aria-hidden="true"
              />
              {/* Target range indicator */}
              <div
                className="bg-green-400 h-full width-40"
                aria-hidden="true"
              />
              {/* High range indicator */}
              <div
                className="bg-red-400 h-full width-30"
                aria-hidden="true"
              />
            </div>

            {/* Current pitch indicator */}
            {metrics.pitch && (
              <div
                className="absolute top-0 w-1 h-full bg-slate-900 dark:bg-white rounded-full transform -translate-x-1/2 pitch-indicator"
                style={{
                  '--pitch-position': `${Math.min(100, Math.max(0,
                    ((metrics.pitch - 100) / 500) * 100
                  ))}%`
                } as React.CSSProperties}
                aria-label={`Pitch indicator at ${formatPitch(metrics.pitch)}`}
              />
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center mt-1">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${getPitchStatus(metrics.pitch) === 'in-range' ? 'bg-green-500' :
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
          <div className="relative h-8 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 meter-fill-dynamic ${getBrightnessStatus(metrics.brightness) === 'in-range' ? 'bg-green-400' :
                  getBrightnessStatus(metrics.brightness) === 'low' ? 'bg-yellow-400' :
                    'bg-red-400'
                }`}
              style={{
                '--meter-width': `${Math.min(100, Math.max(0, metrics.brightness * 100))}%`,
                width: 'var(--meter-width)'
              } as React.CSSProperties}
              aria-label={`Brightness level: ${formatBrightness(metrics.brightness)}`}
            />
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
          <div className="relative h-8 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-200 meter-fill-dynamic ${getConfidenceStatus(metrics.confidence) === 'high' ? 'bg-blue-400' :
                  getConfidenceStatus(metrics.confidence) === 'medium' ? 'bg-yellow-400' :
                    'bg-red-400'
                }`}
              style={{
                '--meter-width': `${Math.min(100, Math.max(0, metrics.confidence * 100))}%`,
                width: 'var(--meter-width)'
              } as React.CSSProperties}
              aria-label={`Confidence level: ${formatConfidence(metrics.confidence)}`}
            />
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
          <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 transition-all duration-300 meter-fill-dynamic"
              style={{
                '--meter-width': `${Math.min(100, Math.max(0, metrics.inRangePercentage))}%`,
                width: 'var(--meter-width)'
              } as React.CSSProperties}
              aria-label={`Progress: ${formatInRange(metrics.inRangePercentage)} in range`}
            />
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
