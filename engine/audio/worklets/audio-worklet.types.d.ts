export {};

declare global {
  type AudioWorkletProcessorInputs = ReadonlyArray<ReadonlyArray<Float32Array>>;
  type AudioWorkletProcessorOutputs = ReadonlyArray<Float32Array[]>;
  type AudioWorkletProcessorParameters = Record<string, Float32Array>;

  interface AudioParamDescriptor {
    name: string;
    defaultValue?: number;
    minValue?: number;
    maxValue?: number;
    automationRate?: 'a-rate' | 'k-rate';
  }

  abstract class AudioWorkletProcessor {
    readonly port: MessagePort;
    constructor(options?: unknown);
    abstract process(
      inputs: AudioWorkletProcessorInputs,
      outputs: AudioWorkletProcessorOutputs,
      parameters: AudioWorkletProcessorParameters
    ): boolean;
  }

  interface AudioWorkletProcessorConstructor {
    new (): AudioWorkletProcessor;
    readonly prototype: AudioWorkletProcessor;
    parameterDescriptors?: ReadonlyArray<AudioParamDescriptor>;
  }

  function registerProcessor(
    name: string,
    processorCtor: AudioWorkletProcessorConstructor
  ): void;
}
