export type ProsodyPrompt = { 
  id: string; 
  statement: string; 
  question: string; 
  level: 'easy' | 'med' | 'hard' 
};

export const PROSODY_PROMPTS: ProsodyPrompt[] = [
  { id: 'ready', level: 'easy', statement: 'I am ready to go.', question: 'Are we ready to go?' },
  { id: 'coffee', level: 'easy', statement: 'I would like a coffee.', question: 'Would you like a coffee?' },
  { id: 'call', level: 'med', statement: 'I can make the call now.', question: 'Can you make the call now?' },
  { id: 'time', level: 'med', statement: 'We have enough time today.', question: 'Do we have enough time today?' },
  { id: 'meeting', level: 'hard', statement: 'The meeting starts at nine.', question: 'Does the meeting start at nine?' },
  { id: 'help', level: 'easy', statement: 'I can help you with that.', question: 'Can I help you with that?' },
  { id: 'work', level: 'med', statement: 'The project is almost done.', question: 'Is the project almost done?' },
  { id: 'weather', level: 'easy', statement: 'It is sunny today.', question: 'Is it sunny today?' },
  { id: 'dinner', level: 'med', statement: 'We should order dinner soon.', question: 'Should we order dinner soon?' },
  { id: 'book', level: 'hard', statement: 'The book was very interesting.', question: 'Was the book very interesting?' },
  { id: 'music', level: 'easy', statement: 'I love this song.', question: 'Do you love this song?' },
  { id: 'travel', level: 'hard', statement: 'The flight leaves at midnight.', question: 'Does the flight leave at midnight?' },
  { id: 'study', level: 'med', statement: 'I need to study more.', question: 'Do you need to study more?' },
  { id: 'phone', level: 'easy', statement: 'My phone is working fine.', question: 'Is your phone working fine?' },
  { id: 'garden', level: 'hard', statement: 'The flowers bloom in spring.', question: 'Do the flowers bloom in spring?' }
];

export function getPromptById(id: string): ProsodyPrompt | undefined {
  return PROSODY_PROMPTS.find(p => p.id === id);
}

export function getPromptsByLevel(level: ProsodyPrompt['level']): ProsodyPrompt[] {
  return PROSODY_PROMPTS.filter(p => p.level === level);
}

export function getRandomPrompt(level?: ProsodyPrompt['level']): ProsodyPrompt {
  const candidates = level ? getPromptsByLevel(level) : PROSODY_PROMPTS;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
