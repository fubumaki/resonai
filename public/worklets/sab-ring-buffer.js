const HEADER_WRITE_INDEX = 0;
const HEADER_READ_INDEX = 1;
const HEADER_CAPACITY_INDEX = 2;
const HEADER_STATE_INDEX = 3;
const HEADER_FIELDS = 4;

export const SAB_HEADER_WRITE_INDEX = HEADER_WRITE_INDEX;
export const SAB_HEADER_READ_INDEX = HEADER_READ_INDEX;
export const SAB_HEADER_CAPACITY_INDEX = HEADER_CAPACITY_INDEX;
export const SAB_HEADER_STATE_INDEX = HEADER_STATE_INDEX;
export const SAB_HEADER_FIELDS = HEADER_FIELDS;

export const SAB_STATE_INIT = 0;
export const SAB_STATE_READY = 1;

export class WorkletRingBuffer {
  constructor(sab, { capacity, frameSize }) {
    this.capacity = capacity;
    this.frameSize = frameSize;
    this.header = new Int32Array(sab, 0, HEADER_FIELDS);
    const offset = HEADER_FIELDS * Int32Array.BYTES_PER_ELEMENT;
    this.data = new Float32Array(sab, offset, capacity * frameSize);
    Atomics.store(this.header, HEADER_WRITE_INDEX, 0);
    Atomics.store(this.header, HEADER_READ_INDEX, 0);
    Atomics.store(this.header, HEADER_CAPACITY_INDEX, capacity);
    Atomics.store(this.header, HEADER_STATE_INDEX, SAB_STATE_INIT);
  }

  markReady() {
    Atomics.store(this.header, HEADER_STATE_INDEX, SAB_STATE_READY);
  }

  push(frameValues) {
    const frameSize = this.frameSize;
    if (!Array.isArray(frameValues) || frameValues.length !== frameSize) return;

    let write = Atomics.load(this.header, HEADER_WRITE_INDEX);
    let read = Atomics.load(this.header, HEADER_READ_INDEX);
    const next = (write + 1) % this.capacity;
    if (next === read) {
      read = (read + 1) % this.capacity;
      Atomics.store(this.header, HEADER_READ_INDEX, read);
    }

    const base = write * frameSize;
    for (let i = 0; i < frameSize; i++) {
      this.data[base + i] = frameValues[i];
    }
    Atomics.store(this.header, HEADER_WRITE_INDEX, next);
  }
}

export function encodeNullable(value) {
  return value == null ? Number.NaN : value;
}
