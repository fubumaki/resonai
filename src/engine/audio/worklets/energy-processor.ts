// @ts-nocheck
class EnergyProcessor extends AudioWorkletProcessor {
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

    let sum = 0;
    for (let i = 0; i < channel.length; i++) sum += channel[i] * channel[i];
    const rms = Math.sqrt(sum / channel.length);

    // crude HF/LF via downsampled every-other sample variance
    let sumEven = 0,
      sumOdd = 0,
      nEven = 0,
      nOdd = 0;
    for (let i = 0; i < channel.length; i++) {
      if ((i & 1) === 0) {
        sumEven += channel[i] * channel[i];
        nEven++;
      } else {
        sumOdd += channel[i] * channel[i];
        nOdd++;
      }
    }
    const hf = nOdd ? sumOdd / nOdd : 0;
    const lf = nEven ? sumEven / nEven : 0;
    const hfLf = lf > 0 ? hf / lf : 0;

    this.port.postMessage({ rms, hfLf });
    return true;
  }
}

registerProcessor('energy-processor', EnergyProcessor);
