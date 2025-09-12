/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Placeholder LPC stub. Implement full LPC later.
class LpcProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }

  constructor() {
    super();
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    // Stub: no real LPC; send nulls now
    this.port.postMessage({ f1: null, f2: null });
    return true;
  }
}

registerProcessor('lpc-processor', LpcProcessor);
