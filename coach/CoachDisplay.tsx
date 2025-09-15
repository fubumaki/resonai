// src/coach/CoachDisplay.tsx
// Component for displaying coach hints and feedback

import React from 'react';
import { CoachHint } from './types';

interface CoachDisplayProps {
  hints: CoachHint[];
  className?: string;
  showSeverity?: boolean;
  maxHints?: number;
}

export function CoachDisplay({ 
  hints, 
  className = '', 
  showSeverity = true,
  maxHints = 3 
}: CoachDisplayProps) {
  if (hints.length === 0) {
    return null;
  }

  const displayHints = hints.slice(0, maxHints);

  const getSeverityStyles = (severity?: string) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'gentle':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'info':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'gentle':
        return '💙';
      case 'info':
      default:
        return '💡';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {displayHints.map((hint, index) => (
        <div
          key={`${hint.id}-${index}`}
          className={`
            p-3 rounded-lg border-l-4 text-sm font-medium
            ${getSeverityStyles(hint.severity)}
            animate-in slide-in-from-top-2 duration-300
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start space-x-2">
            {showSeverity && (
              <span className="flex-shrink-0 text-lg" aria-hidden="true">
                {getSeverityIcon(hint.severity)}
              </span>
            )}
            <span className="flex-1">{hint.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact version for smaller spaces
export function CoachDisplayCompact({ 
  hints, 
  className = '' 
}: { 
  hints: CoachHint[]; 
  className?: string; 
}) {
  if (hints.length === 0) {
    return null;
  }

  const latestHint = hints[hints.length - 1];

  return (
    <div 
      className={`
        px-3 py-2 rounded-md text-sm font-medium
        bg-blue-50 border border-blue-200 text-blue-800
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <span className="mr-2" aria-hidden="true">💡</span>
      {latestHint.text}
    </div>
  );
}

// Coach status indicator
export function CoachStatus({ 
  isActive, 
  hintCount 
}: { 
  isActive: boolean; 
  hintCount: number; 
}) {
  if (!isActive) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span>Coach active</span>
      {hintCount > 0 && (
        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
          {hintCount} hint{hintCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
