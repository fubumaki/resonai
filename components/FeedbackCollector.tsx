'use client';

import React, { useState, useEffect } from 'react';

interface FeedbackData {
  feature: 'calibration' | 'hud' | 'general';
  rating: number; // 1-5
  comments: string;
  userAgent: string;
  timestamp: number;
  sessionId: string;
}

interface FeedbackCollectorProps {
  feature: 'calibration' | 'hud' | 'general';
  onFeedback?: (data: FeedbackData) => void;
  className?: string;
}

export default function FeedbackCollector({ 
  feature, 
  onFeedback,
  className = '' 
}: FeedbackCollectorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Show feedback collector after user has used the feature for a while
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if user has interacted with the feature
      const hasInteracted = sessionStorage.getItem(`feedback_${feature}_interacted`);
      if (hasInteracted && !submitted) {
        setIsVisible(true);
      }
    }, 30000); // Show after 30 seconds of interaction

    return () => clearTimeout(timer);
  }, [feature, submitted]);

  // Track user interaction with the feature
  useEffect(() => {
    const handleInteraction = () => {
      sessionStorage.setItem(`feedback_${feature}_interacted`, 'true');
    };

    // Add event listeners for different types of interactions
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [feature]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      feature,
      rating,
      comments: comments.trim(),
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: sessionStorage.getItem('session_id') || 'unknown',
    };

    try {
      // Send feedback to analytics
      if (onFeedback) {
        onFeedback(feedbackData);
      }

      // Send to backend if available
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      setSubmitted(true);
      setIsVisible(false);

      // Track feedback submission
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'feedback_submitted', {
          feature,
          rating,
          has_comments: comments.trim().length > 0,
        });
      }

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Still mark as submitted to avoid repeated prompts
      setSubmitted(true);
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setSubmitted(true);
  };

  if (!isVisible || submitted) {
    return null;
  }

  const getFeatureName = () => {
    switch (feature) {
      case 'calibration':
        return 'microphone calibration';
      case 'hud':
        return 'practice HUD';
      case 'general':
        return 'this feature';
      default:
        return 'this feature';
    }
  };

  const getQuestion = () => {
    switch (feature) {
      case 'calibration':
        return 'How was your experience setting up your microphone?';
      case 'hud':
        return 'How helpful was the practice HUD for your session?';
      case 'general':
        return 'How was your experience with this feature?';
      default:
        return 'How was your experience?';
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Quick Feedback
          </h3>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Dismiss feedback"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {getQuestion()}
        </p>

        {/* Star Rating */}
        <div className="flex items-center space-x-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl transition-colors ${
                star <= rating
                  ? 'text-yellow-400'
                  : 'text-slate-300 dark:text-slate-600'
              } hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Comments */}
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder={`Tell us more about your experience with ${getFeatureName()}...`}
          className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={3}
          maxLength={500}
        />

        {/* Character count */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-right mb-3">
          {comments.length}/500
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            {isSubmitting ? 'Sending...' : 'Submit'}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Your feedback helps us improve {getFeatureName()}.
        </p>
      </div>
    </div>
  );
}
