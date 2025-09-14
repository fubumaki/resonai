'use client';

import { useEffect, useState } from 'react';
import { CoachMessage } from '@/lib/coach-copy';

interface MicroInteractionProps {
  message: CoachMessage;
  onComplete?: () => void;
  duration?: number;
}

export default function MicroInteraction({ 
  message, 
  onComplete, 
  duration = 2000 
}: MicroInteractionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setIsAnimating(true);
    
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onComplete]);

  if (!isVisible) return null;

  const getAnimationClass = () => {
    if (!isAnimating) return '';
    
    switch (message.animation) {
      case 'bounce':
        return 'animate-bounce';
      case 'glow':
        return 'animate-pulse shadow-lg shadow-blue-500/50';
      case 'pulse':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  const getToneClass = () => {
    switch (message.tone) {
      case 'celebratory':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'encouraging':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'gentle':
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50';
      case 'supportive':
        return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50';
    }
  };

  return (
    <div 
      className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        px-6 py-4 rounded-lg shadow-lg border
        transition-all duration-300 ease-out
        ${getToneClass()}
        ${getAnimationClass()}
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        z-50 max-w-sm text-center
      `}
      role="alert"
      aria-live="polite"
    >
      <p className="text-sm font-medium">
        {message.text}
      </p>
    </div>
  );
}
