/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
class PitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }
  private _buffer: Float32Array;
  private _hop: number;
  private _ptr: number = 0;

  constructor() {
    super();
    const sampleRate = sampleRate || 48000;
    const windowSize = 1024;
    this._buffer = new Float32Array(windowSize);
    this._hop = Math.floor(windowSize / 2);
    this._ptr = 0;
  }

  // Very rough ACF-based pitch with confidence
  private estimatePitch(frame: Float32Array): { f0: number | null; conf: number } {
    const N = frame.length;
    const maxLag = Math.floor(sampleRate / 60); // up to ~60 Hz lower bound
    let minLag = Math.floor(sampleRate / 500); // ~500 Hz upper bound
    if (minLag < 2) minLag = 2;

    let bestLag = 0;
    let bestCorr = 0;
    let energy0 = 0;
    for (let i = 0; i < N; i++) energy0 += frame[i] * frame[i];
    if (energy0 === 0) return { f0: null, conf: 0 };

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += frame[i] * frame[i + lag];
      const corr = sum / (N - lag);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    const f0 = bestLag > 0 ? sampleRate / bestLag : null;
    const conf = Math.max(0, Math.min(1, bestCorr));
    return { f0, conf };
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;

    // Slide samples into buffer
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._ptr++] = channel[i];
      if (this._ptr >= this._buffer.length) {
        const { f0, conf } = this.estimatePitch(this._buffer);
        this.port.postMessage({ f0Hz: f0, f0Conf: conf });
        // shift by hop
        this._buffer.copyWithin(0, this._hop);
        this._ptr = this._buffer.length - this._hop;
      }
    }

    return true;
  }
}

registerProcessor('pitch-processor', PitchProcessor);
