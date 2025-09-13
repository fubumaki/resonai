// src/app/coach-demo/page.tsx
// Comprehensive demo of the Guiding AI Trainer system

'use client';

import { FlowRunnerWithCoach } from '@/flow/FlowRunnerWithCoach';
import { FlowJson } from '@/flow/types';
import { useCoach, useCoachAria } from '@/coach';
import { CoachStatus } from '@/coach/CoachDisplay';
import { useState, useEffect } from 'react';

// Demo flow with all coach features
const demoFlow: FlowJson = {
  version: 1,
  flowName: "Coach Demo Flow",
  steps: [
    {
      id: "welcome",
      type: "info",
      title: "Guiding AI Trainer Demo",
      content: "This demo showcases the complete coach system with real-time guidance, environment awareness, and adaptive feedback.",
      next: "warmup"
    },
    {
      id: "warmup",
      type: "drill",
      title: "SOVT Warm-Up",
      copy: "Gentle lip trill or hum for about 30 seconds. The coach will provide real-time feedback on smoothness and safety.",
      durationSec: 30,
      metrics: ["voicedTimePct", "jitterEma"],
      next: "glide"
    },
    {
      id: "glide",
      type: "drill",
      title: "Pitch Glide",
      copy: "Glide smoothly up, then down. The coach will guide you on smoothness and target adherence.",
      target: { pitchRange: "mid" },
      metrics: ["timeInTargetPct", "jitterEma"],
      successThreshold: { timeInTargetPct: 0.7 },
      next: "phrase"
    },
    {
      id: "phrase",
      type: "drill",
      title: "Prosody Phrase",
      copy: "Say: \"How are you doing?\" with a gentle rise at the end. The coach will provide DTW-based feedback.",
      target: { intonation: "rising", phraseText: "How are you doing?" },
      metrics: ["endRiseDetected", "prosodyVar"],
      successThreshold: { endRiseDetected: true },
      next: "reflection"
    },
    {
      id: "reflection",
      type: "reflection",
      title: "Reflection",
      copy: "How did the coach feedback feel?",
      prompts: [
        "How helpful was the real-time feedback? (1-5)",
        "Any specific hints that stood out?",
        "Would you like more or less guidance?"
      ]
    }
  ]
};

export default function CoachDemoPage() {
  const [showEnvironmentInfo, setShowEnvironmentInfo] = useState(false);
  const coach = useCoach();
  const { announcement, announceHint } = useCoachAria();

  // Announce coach hints
  useEffect(() => {
    coach.getCurrentHints().forEach(hint => announceHint(hint));
  }, [coach.getCurrentHints(), announceHint]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with environment info */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-blue-800">
                Guiding AI Trainer - Demo Mode
              </span>
              <CoachStatus 
                isActive={coach.isActive} 
                hintCount={coach.getCurrentHints().length} 
              />
            </div>
            <button
              onClick={() => setShowEnvironmentInfo(!showEnvironmentInfo)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showEnvironmentInfo ? 'Hide' : 'Show'} Environment Info
            </button>
          </div>
          
          {showEnvironmentInfo && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">Environment Status</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Isolation:</span> 
                  <span className={`ml-2 ${coach.environmentState.isIsolated ? 'text-green-600' : 'text-yellow-600'}`}>
                    {coach.environmentState.isIsolated ? 'Active' : 'Fallback Mode'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Sample Rate:</span> 
                  <span className="ml-2">{coach.environmentState.sampleRate}Hz</span>
                </div>
                <div>
                  <span className="font-medium">Audio Context:</span> 
                  <span className="ml-2">{coach.environmentState.audioContextState}</span>
                </div>
                <div>
                  <span className="font-medium">Enhancements:</span> 
                  <span className={`ml-2 ${coach.environmentState.enhancementsOn ? 'text-yellow-600' : 'text-green-600'}`}>
                    {coach.environmentState.enhancementsOn ? 'Detected' : 'Clean'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Guiding AI Trainer - Complete Demo
          </h1>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Features Demonstrated</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Real-time Guidance</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Safety monitoring (loudness)</li>
                  <li>• Smoothness feedback (jitter)</li>
                  <li>• Target adherence guidance</li>
                  <li>• Confidence encouragement</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Environment Awareness</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• Cross-origin isolation status</li>
                  <li>• Audio device changes</li>
                  <li>• Windows enhancements detection</li>
                  <li>• Sample rate validation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Adaptive Feedback</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• DTW tier-based praise/nudge</li>
                  <li>• End-rise detection feedback</li>
                  <li>• Rate-limited hints (1/second)</li>
                  <li>• Priority-based hint selection</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Accessibility</h3>
                <ul className="space-y-1 text-gray-600">
                  <li>• ARIA live region announcements</li>
                  <li>• Screen reader compatibility</li>
                  <li>• Keyboard navigation</li>
                  <li>• Windows 11 + Firefox + NVDA</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <FlowRunnerWithCoach flowJson={demoFlow} />
      </div>

      {/* ARIA announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
