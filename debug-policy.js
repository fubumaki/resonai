// Debug script to test policy behavior
const { CoachPolicy } = require('./src/coach/policyDefault.ts');

const policy = new CoachPolicy();
policy.startStep();

console.log('Testing policy...');

// Test 1: Jitter hint
const jittery = [{
  t: Date.now(),
  jitterEma: 0.5 // Above threshold
}];

console.log('Jittery input:', jittery);
const hints1 = policy.realtime(jittery);
console.log('Jitter hints:', hints1);

// Test 2: Safety hint
const dangerous = Array.from({length: 500}, (_,i) => ({
  t: i * 10,
  loudNorm: 0.95, // Very loud
  jitterEma: 0.5   // Also jittery
}));

console.log('Dangerous input length:', dangerous.length);
const hints2 = policy.realtime(dangerous);
console.log('Safety hints:', hints2);

// Test 3: Post-utterance
const result = policy.post({
  dtwTier: 5,
  endRiseDetected: false,
  stats: {}
});

console.log('Post hints:', result);
