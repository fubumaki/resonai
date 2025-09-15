export const COPY = {
  // Pre
  setup: "Headphones on; Windows mic 'enhancements' off for a clean signal.",
  goalWarmup: "Goal: easy airflow and steady tone.",
  goalGlide: "Goal: one smooth, continuous line.",
  goalPhrase: "Goal: a gentle upward lilt on the last word.",

  // Realtime (safety + technique)
  tooLoud: "Take a breath—make it a little lighter?",
  jitter: "Slow the glide—imagine drawing one line.",
  target: "Try a slower, smaller sweep—stay inside the band.",
  confidence: "Let the tone settle—start gently, keep it steady.",

  // Post‑phrase
  praise: "Lovely contour match! One more for consistency.",
  nudge: "You've got the shape—add a touch more lift at the end.",
  retry: "Good effort—try again with a gentler start then a small rise.",
  rise:  "On the last word, let it float up just a little.",

  // Environment
  isolationDropped: "Performance mode paused—fallback detector active.",
  deviceChanged: "Audio device changed—check your microphone.",
  enhancementsOn: "Windows mic enhancements detected—disable for clean signal."
} as const;