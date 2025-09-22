'use client';

import React from 'react';
import { PracticeMetrics, TargetRanges } from '@/hooks/usePracticeMetrics';

type PitchStatus = 'no-signal' | 'low' | 'high' | 'in-range';
type BrightnessStatus = 'low' | 'high' | 'in-range';
type ConfidenceStatus = 'low' | 'medium' | 'high';

const pitchStatusClasses: Record<PitchStatus, string> = {
  'in-range': 'bg-green-500',
  low: 'bg-red-500',
  high: 'bg-red-500',
  'no-signal': 'bg-gray-400'
};

const pitchStatusLabels: Record<PitchStatus, string> = {
  'in-range': 'In range',
  low: 'Too low',
  high: 'Too high',
  'no-signal': 'No signal'
};

const brightnessStatusClasses: Record<BrightnessStatus, string> = {
  'in-range': 'bg-green-400',
  low: 'bg-yellow-400',
  high: 'bg-red-400'
};

const confidenceStatusClasses: Record<ConfidenceStatus, string> = {
  high: 'bg-blue-400',
  medium: 'bg-yellow-400',
  low: 'bg-red-400'
};

interface PracticeHUDProps {
  metrics: PracticeMetrics;
  targetRanges?: TargetRanges;
  isVisible?: boolean;
  className?: string;
  showAdvancedMetrics?: boolean;
}

export default function PracticeHUD({
  metrics,
  targetRanges,
  isVisible = true,
  className = '',
  showAdvancedMetrics = false
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
  const getPitchStatus = (pitch: number | null): PitchStatus => {
    if (pitch === null) return 'no-signal';
    if (pitch < ranges.pitchMin) return 'low';
    if (pitch > ranges.pitchMax) return 'high';
    return 'in-range';
  };

  const getBrightnessStatus = (brightness: number): BrightnessStatus => {
    if (brightness < ranges.brightnessMin) return 'low';
    if (brightness > ranges.brightnessMax) return 'high';
    return 'in-range';
  };

  const getConfidenceStatus = (confidence: number): ConfidenceStatus => {
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

  // Calculate enhanced metrics according to contracts
  const timeInTarget = metrics.timeInTargetPct || 0;
  const smoothness = metrics.smoothness || (1 - (metrics.jitterEma || 0));
  const expressiveness = metrics.expressiveness || 0;

  const pitchStatus = getPitchStatus(metrics.pitch);
  const brightnessStatus = getBrightnessStatus(metrics.brightness);
  const confidenceStatus = getConfidenceStatus(metrics.confidence);

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
                className="bg-red-400 h-full"
                style={{ width: '30%' }}
                aria-hidden="true"
              />
              {/* Target range indicator */}
              <div
                className="bg-green-400 h-full"
                style={{ width: '40%' }}
                aria-hidden="true"
              />
              {/* High range indicator */}
              <div
                className="bg-red-400 h-full"
                style={{ width: '30%' }}
                aria-hidden="true"
              />
            </div>

            {/* Current pitch indicator */}
            {metrics.pitch && (
              <div
                className="absolute top-0 w-1 h-full bg-slate-900 dark:bg-white rounded-full transform -translate-x-1/2 pitch-indicator"
                style={{
                  left: `${Math.min(100, Math.max(0,
                    ((metrics.pitch - 100) / 500) * 100
                  ))}%`
                }}
                aria-label={`Pitch indicator at ${formatPitch(metrics.pitch)}`}
              />
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center mt-1">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${pitchStatusClasses[pitchStatus]}`}
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {pitchStatusLabels[pitchStatus]}
            </span>
          </div>
        </div>

        {/* Core Metrics Row */}
        <div className="col-span-2 grid grid-cols-3 gap-2 mb-4">
          {/* Time in Target */}
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Time in Target</div>
            <div className="text-lg font-mono font-semibold text-green-600 dark:text-green-400">
              {formatInRange(timeInTarget * 100)}
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, timeInTarget * 100)}%` }}
              />
            </div>
          </div>

          {/* Smoothness */}
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Smoothness</div>
            <div className="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400">
              {Math.round(smoothness * 100)}%
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, smoothness * 100)}%` }}
              />
            </div>
          </div>

          {/* Expressiveness */}
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Expressiveness</div>
            <div className="text-lg font-mono font-semibold text-purple-600 dark:text-purple-400">
              {Math.round(expressiveness * 100)}%
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, expressiveness * 100)}%` }}
              />
            </div>
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
              className={`h-full transition-all duration-200 ${brightnessStatusClasses[brightnessStatus]}`}
              style={{
                width: `${Math.min(100, Math.max(0, metrics.brightness * 100))}%`
              }}
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
              className={`h-full transition-all duration-200 ${confidenceStatusClasses[confidenceStatus]}`}
              style={{
                width: `${Math.min(100, Math.max(0, metrics.confidence * 100))}%`
              }}
              aria-label={`Confidence level: ${formatConfidence(metrics.confidence)}`}
            />
          </div>
        </div>

        {/* Advanced Metrics (when enabled) */}
        {showAdvancedMetrics && (
          <div className="col-span-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Voiced Time:</span>
                <span className="ml-2 font-mono">{Math.round((metrics.voicedTimePct || 0) * 100)}%</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Jitter EMA:</span>
                <span className="ml-2 font-mono">{(metrics.jitterEma || 0).toFixed(3)}</span>
              </div>
            </div>
          </div>
        )}
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
