export function hzToNote(hz: number) {
  const A4 = 440;
  const n = Math.round(12 * Math.log2(hz / A4));
  const midi = n + 69;
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const name = names[(midi % 12 + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}`;
}
