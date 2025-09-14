/**
 * Coach-tone copy and micro-interactions for Instant Practice
 * Follows kindness-first, encouraging pattern
 */

export interface CoachMessage {
  text: string;
  tone: 'encouraging' | 'celebratory' | 'gentle' | 'supportive';
  animation?: 'bounce' | 'glow' | 'pulse' | 'none';
}

export const COACH_MESSAGES = {
  // Initial state
  ready: {
    text: "Ready to practice? Let's start with your voice.",
    tone: 'encouraging' as const,
    animation: 'none' as const,
  },
  
  // Permission states
  micNeeded: {
    text: "Let's enable your microphone to get started.",
    tone: 'gentle' as const,
    animation: 'none' as const,
  },
  
  micDenied: {
    text: "No worries! You can enable your microphone anytime to start practicing.",
    tone: 'supportive' as const,
    animation: 'none' as const,
  },
  
  // Recording states
  recording: {
    text: "Great! Keep going - you're doing well.",
    tone: 'encouraging' as const,
    animation: 'pulse' as const,
  },
  
  // Success states
  sessionComplete: {
    text: "Nice work! Ready for another round?",
    tone: 'celebratory' as const,
    animation: 'bounce' as const,
  },
  
  // Practice feedback
  pitchHit: {
    text: "Perfect! That's exactly the resonance we're looking for.",
    tone: 'celebratory' as const,
    animation: 'glow' as const,
  },
  
  pitchNear: {
    text: "Almost there! Try opening your throat a bit more for a warmer tone.",
    tone: 'encouraging' as const,
    animation: 'pulse' as const,
  },
  
  pitchMiss: {
    text: "No worries! Every attempt gets you closer. Let's try again.",
    tone: 'supportive' as const,
    animation: 'none' as const,
  },
  
  // Milestone celebrations
  firstSession: {
    text: "Amazing! You've completed your first practice session!",
    tone: 'celebratory' as const,
    animation: 'bounce' as const,
  },
  
  improvement: {
    text: "You're improving with every try. Keep it up!",
    tone: 'encouraging' as const,
    animation: 'glow' as const,
  },
  
  // Error states
  error: {
    text: "Something went wrong. Let's try again in a moment.",
    tone: 'gentle' as const,
    animation: 'none' as const,
  },
} as const;

export function getCoachMessage(key: keyof typeof COACH_MESSAGES): CoachMessage {
  return COACH_MESSAGES[key];
}

export function getRandomEncouragement(): CoachMessage {
  const encouragements = [
    "You're doing great!",
    "Keep up the excellent work!",
    "That's the spirit!",
    "You're getting better each time!",
    "Wonderful progress!",
    "You've got this!",
  ];
  
  const randomText = encouragements[Math.floor(Math.random() * encouragements.length)];
  
  return {
    text: randomText,
    tone: 'encouraging',
    animation: 'glow',
  };
}

export function getProgressMessage(step: number, total: number): CoachMessage {
  const progress = step / total;
  
  if (progress === 1) {
    return {
      text: "Congratulations! You've completed all steps!",
      tone: 'celebratory',
      animation: 'bounce',
    };
  }
  
  if (progress >= 0.8) {
    return {
      text: "You're almost there! Just a few more steps.",
      tone: 'encouraging',
      animation: 'pulse',
    };
  }
  
  if (progress >= 0.5) {
    return {
      text: "Great progress! You're halfway there.",
      tone: 'encouraging',
      animation: 'glow',
    };
  }
  
  return {
    text: "Let's get started! You're doing great.",
    tone: 'encouraging',
    animation: 'none',
  };
}
