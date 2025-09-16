// Placeholder LPC stub. Implement full LPC later.

type LpcProcessorMessage = {
  f1: number | null;
  f2: number | null;
};

class LpcProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(): ReadonlyArray<AudioParamDescriptor> {
    return [];
  }

  process(
    inputs: AudioWorkletProcessorInputs,
    _outputs: AudioWorkletProcessorOutputs,
    _parameters: AudioWorkletProcessorParameters
  ): boolean {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    // Stub: no real LPC; send nulls now
    const message: LpcProcessorMessage = { f1: null, f2: null };
    this.port.postMessage(message);
    return true;
  }
}

registerProcessor('lpc-processor', LpcProcessor);
