'use client';

import { useEffect, useRef, useState } from 'react';
import { getFeatureFlag } from '@/lib/feature-flags';
import { getExperimentVariant } from '@/lib/ab';
import { 
  trackScreenView, 
  trackPermissionRequested, 
  trackPermissionGranted, 
  trackPermissionDenied,
  trackMicSessionStart,
  trackMicSessionEnd,
  trackTtvMeasured,
  trackActivation
} from '@/lib/analytics';
import { getCoachMessage, getProgressMessage } from '@/lib/coach-copy';
import MicPrimerDialog from '@/components/MicPrimerDialog';
import ProgressBar from '@/components/ProgressBar';
import MicroInteraction from '@/components/MicroInteraction';

export default function InstantPractice() {
  const [micReady, setMicReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrimer, setShowPrimer] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [hasActivated, setHasActivated] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<keyof typeof import('@/lib/coach-copy').COACH_MESSAGES>('ready');
  const [showMicroInteraction, setShowMicroInteraction] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const ttvStartTime = useRef<number>(Date.now());

  // Feature flags and experiments
  const instantPracticeEnabled = getFeatureFlag('ff.instantPractice');
  const hapticsEnabled = getFeatureFlag('ff.haptics');
  const primerShort = getFeatureFlag('ff.permissionPrimerShort');
  const signUpFirst = getFeatureFlag('ff.signUpFirst');
  
  const e1Variant = getExperimentVariant('E1');
  const e2Variant = getExperimentVariant('E2');

  useEffect(() => {
    // Check pilot cohort cookie
    const pilotCohort = document.cookie
      .split('; ')
      .find(row => row.startsWith('pilot_cohort='))
      ?.split('=')[1];
    
    if (pilotCohort !== 'pilot') {
      // Not in pilot cohort, redirect to home
      window.location.href = '/';
      return;
    }

    if (!instantPracticeEnabled) {
      // Redirect to home if feature is disabled
      window.location.href = '/';
      return;
    }

    // Track screen view
    trackScreenView('instant_practice');
    
    // Set TTV start time
    ttvStartTime.current = Date.now();
  }, [instantPracticeEnabled]);

  const requestMic = async () => {
    try {
      // Show primer for E2A variant
      if (e2Variant === 'A' && primerShort) {
        setShowPrimer(true);
        return;
      }

      await requestMicPermission();
    } catch (error) {
      console.error('Mic request failed:', error);
    }
  };

  const requestMicPermission = async () => {
    try {
      trackPermissionRequested('microphone', 'instant_practice');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicReady(true);
      setError(null);
      setCurrentMessage('ready');
      
      trackPermissionGranted('instant_practice');
      
      // Measure TTV
      const ttv = Date.now() - ttvStartTime.current;
      trackTtvMeasured(ttv);
      
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Microphone access denied');
      setCurrentMessage('micDenied');
      trackPermissionDenied('instant_practice');
    }
  };

  const handlePrimerAccept = async () => {
    setShowPrimer(false);
    await requestMicPermission();
  };

  const handlePrimerDecline = () => {
    setShowPrimer(false);
    setCurrentMessage('micDenied');
    trackPermissionDenied('instant_practice');
  };

  const startStop = () => {
    if (!micReady) return;
    
    if (!recording) {
      // Haptic feedback
      if (hapticsEnabled && navigator.vibrate) {
        navigator.vibrate(10);
      }
      
      const mr = new MediaRecorder(mediaStreamRef.current!);
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setSessionStartTime(Date.now());
      setCurrentMessage('recording');
      
      // Update pitch meter state
      const pitchMeter = document.querySelector('.pitch-meter');
      if (pitchMeter) {
        pitchMeter.setAttribute('data-active', 'true');
      }
      
      trackMicSessionStart();
      
      // Dispatch analytics event
      window.dispatchEvent(new CustomEvent('analytics:track', { 
        detail: { event: 'mic_session_start', props: {}, ts: Date.now() } 
      }));
    } else {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      
      // Update pitch meter state
      const pitchMeter = document.querySelector('.pitch-meter');
      if (pitchMeter) {
        pitchMeter.setAttribute('data-active', 'false');
      }
      
      const duration = sessionStartTime ? Date.now() - sessionStartTime : undefined;
      trackMicSessionEnd(duration);
      
      // Dispatch analytics event
      window.dispatchEvent(new CustomEvent('analytics:track', { 
        detail: { event: 'mic_session_end', props: { duration }, ts: Date.now() } 
      }));
      
      // Show celebration for first session
      if (!hasActivated) {
        setCurrentMessage('firstSession');
        setShowMicroInteraction(true);
        trackActivation('instant_practice_m0');
        setHasActivated(true);
      } else {
        setCurrentMessage('sessionComplete');
        setShowMicroInteraction(true);
      }
    }
  };

  const getCurrentCoachMessage = () => {
    return getCoachMessage(currentMessage);
  };

  if (!instantPracticeEnabled) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 pb-20">
      {/* Progress bar for multi-step flow */}
      <div className="p-4">
        <ProgressBar 
          currentStep={micReady ? 2 : 1} 
          totalSteps={2} 
        />
      </div>

      {/* Visual feedback area */}
      <section className="flex-1 flex items-center justify-center p-8" aria-live="polite">
        <div className="text-center space-y-6">
          <div 
            className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
              recording 
                ? 'bg-blue-100 dark:bg-blue-900/20 scale-110' 
                : 'bg-slate-100 dark:bg-slate-800'
            }`}
            data-active={recording}
          >
            <span className="text-4xl">
              {recording ? '🎤' : '🎵'}
            </span>
          </div>
          
          {/* Pitch meter for visual feedback */}
          <div 
            className="pitch-meter w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden transition-all duration-300"
            data-active="false"
            aria-label="Audio level indicator"
          >
            <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-300 w-0" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Instant Practice
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {getCurrentCoachMessage().text}
            </p>
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bottom controls */}
      <nav className="fixed bottom-20 left-0 right-0 p-4 safe-area-pb">
        <div className="max-w-sm mx-auto">
          {!micReady ? (
            <button 
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 active:scale-95"
              onClick={requestMic}
              aria-label="Enable microphone to start practicing"
            >
              Start with voice
            </button>
          ) : (
            <button 
              className={`w-full py-4 px-6 font-semibold rounded-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 active:scale-95 ${
                recording
                  ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                  : 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
              }`}
              onClick={startStop}
              aria-pressed={recording}
            >
              {recording ? 'Stop' : 'Start'}
            </button>
          )}
        </div>
      </nav>

      {/* Permission primer dialog */}
      <MicPrimerDialog
        isOpen={showPrimer}
        onAccept={handlePrimerAccept}
        onDecline={handlePrimerDecline}
      />

      {/* Micro-interactions */}
      {showMicroInteraction && (
        <MicroInteraction
          message={getCurrentCoachMessage()}
          onComplete={() => setShowMicroInteraction(false)}
        />
      )}
    </main>
  );
}
