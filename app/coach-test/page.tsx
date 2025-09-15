// src/app/coach-test/page.tsx
// Test page for the Guiding AI Trainer

'use client';

import { FlowRunnerWithCoach } from '@/flow/FlowRunnerWithCoach';
import { FlowJson } from '@/flow/types';

// Test flow JSON with coach integration
const testFlow: FlowJson = {
  version: 1,
  flowName: "Coach Test Flow",
  steps: [
    {
      id: "welcome",
      type: "info",
      title: "Welcome to Coach Test",
      content: "This flow will test the Guiding AI Trainer system. The coach will provide real-time feedback as you practice.",
      next: "warmup"
    },
    {
      id: "warmup",
      type: "drill",
      title: "SOVT Warm-Up",
      copy: "Gentle lip trill or hum for about 30 seconds. Keep it easy and steady.",
      durationSec: 30,
      metrics: ["voicedTimePct", "jitterEma"],
      next: "glide"
    },
    {
      id: "glide",
      type: "drill",
      title: "Pitch Glide",
      copy: "Glide smoothly up, then down. Aim for steady movement (no sudden jumps).",
      target: { pitchRange: "mid" },
      metrics: ["timeInTargetPct", "jitterEma"],
      successThreshold: { timeInTargetPct: 0.7 },
      next: "phrase"
    },
    {
      id: "phrase",
      type: "drill",
      title: "Prosody Phrase",
      copy: "Say: \"How are you doing?\" with a gentle rise at the end.",
      target: { intonation: "rising", phraseText: "How are you doing?" },
      metrics: ["endRiseDetected", "prosodyVar"],
      successThreshold: { endRiseDetected: true },
      next: "reflection"
    },
    {
      id: "reflection",
      type: "reflection",
      title: "Reflection",
      copy: "Great work! How did the coach feedback feel?",
      prompts: [
        "How helpful was the real-time feedback? (1-5)",
        "Any specific hints that stood out?",
        "Would you like more or less guidance?"
      ]
    }
  ]
};

export default function CoachTestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Guiding AI Trainer - Test Page
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            This page demonstrates the integrated coach system. The trainer will provide:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li><strong>Pre-lesson briefs:</strong> Focus goals and setup reminders</li>
            <li><strong>Real-time micro-hints:</strong> Gentle guidance during practice</li>
            <li><strong>End-utterance feedback:</strong> Immediate summary with actionable advice</li>
            <li><strong>Post-session reflection:</strong> Adaptive nudges for next time</li>
          </ul>
        </div>
        
        <FlowRunnerWithCoach flowJson={testFlow} />
      </div>
    </div>
  );
}
