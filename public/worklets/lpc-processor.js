class LpcProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;
    this.port.postMessage({ f1: null, f2: null });
    return true;
  }
}
registerProcessor('lpc-processor', LpcProcessor);
