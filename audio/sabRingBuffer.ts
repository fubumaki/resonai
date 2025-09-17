export const SAB_HEADER_WRITE_INDEX = 0;
export const SAB_HEADER_READ_INDEX = 1;
export const SAB_HEADER_CAPACITY_INDEX = 2;
export const SAB_HEADER_STATE_INDEX = 3;
export const SAB_HEADER_FIELDS = 4;

export const SAB_STATE_INIT = 0;
export const SAB_STATE_READY = 1;

export const PITCH_RING_BUFFER_FRAME_VALUES = 6;
export const DEFAULT_PITCH_RING_CAPACITY = 256;
export const SAB_RING_BUFFER_PATH = '/worklets/sab-ring-buffer.js';

export type PitchSabFrame = {
  pitch: number | null;
  clarity: number;
  rms: number;
  centroidHz: number | null;
  rolloffHz: number | null;
  h1h2: number | null;
};

export type PitchSabRingBuffer = {
  sab: SharedArrayBuffer;
  header: Int32Array;
  data: Float32Array;
  capacity: number;
  valuesPerFrame: number;
};

function decodeNullable(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function createPitchSabRingBuffer(
  capacity: number = DEFAULT_PITCH_RING_CAPACITY,
  valuesPerFrame: number = PITCH_RING_BUFFER_FRAME_VALUES,
): PitchSabRingBuffer {
  const safeCapacity = Math.max(2, Math.floor(capacity));
  const safeFrame = Math.max(1, Math.floor(valuesPerFrame));
  const headerBytes = SAB_HEADER_FIELDS * Int32Array.BYTES_PER_ELEMENT;
  const dataBytes = safeCapacity * safeFrame * Float32Array.BYTES_PER_ELEMENT;
  const sab = new SharedArrayBuffer(headerBytes + dataBytes);
  const header = new Int32Array(sab, 0, SAB_HEADER_FIELDS);
  header.fill(0);
  header[SAB_HEADER_CAPACITY_INDEX] = safeCapacity;
  const data = new Float32Array(sab, headerBytes, safeCapacity * safeFrame);
  return {
    sab,
    header,
    data,
    capacity: safeCapacity,
    valuesPerFrame: safeFrame,
  };
}

export function resetPitchSab(buffer: PitchSabRingBuffer): void {
  Atomics.store(buffer.header, SAB_HEADER_WRITE_INDEX, 0);
  Atomics.store(buffer.header, SAB_HEADER_READ_INDEX, 0);
  Atomics.store(buffer.header, SAB_HEADER_STATE_INDEX, SAB_STATE_INIT);
}

export function markPitchSabReady(buffer: PitchSabRingBuffer): void {
  Atomics.store(buffer.header, SAB_HEADER_STATE_INDEX, SAB_STATE_READY);
}

export function drainPitchSab(buffer: PitchSabRingBuffer): PitchSabFrame[] {
  const frames: PitchSabFrame[] = [];
  const { header, data, capacity, valuesPerFrame } = buffer;
  let read = Atomics.load(header, SAB_HEADER_READ_INDEX);
  const write = Atomics.load(header, SAB_HEADER_WRITE_INDEX);
  if (read === write) return frames;

  while (read !== write) {
    const base = read * valuesPerFrame;
    frames.push({
      pitch: decodeNullable(data[base]),
      clarity: data[base + 1],
      rms: data[base + 2],
      centroidHz: decodeNullable(data[base + 3]),
      rolloffHz: decodeNullable(data[base + 4]),
      h1h2: decodeNullable(data[base + 5]),
    });
    read = (read + 1) % capacity;
  }

  Atomics.store(header, SAB_HEADER_READ_INDEX, read);
  return frames;
}
