// public/worklets/pitch.worklet.js
// Real-time pitch + brightness (spectral centroid) + H1–H2 estimator.
// Posts: { pitch, clarity, rms, centroidHz, rolloffHz, h1h2 } ~every 20ms.

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Ring buffer for 2048 samples
    this.buf = new Float32Array(2048);
    this.write = 0;

    // Analysis params
    this.frameSize = 1024;    // radix-2
    this.hop = 512;           // ~10–12ms at 48k
    this.minHz = 70;
    this.maxHz = 500;
    this.voicingRms = 0.012;

    // FFT scratch
    this.re = new Float32Array(this.frameSize);
    this.im = new Float32Array(this.frameSize);
    this.window = hanning(this.frameSize);

    this.port.onmessage = (e) => {
      const { minHz, maxHz, voicingRms } = e.data || {};
      if (minHz) this.minHz = minHz;
      if (maxHz) this.maxHz = maxHz;
      if (voicingRms) this.voicingRms = voicingRms;
    };
  }

  static get parameterDescriptors() { return []; }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const chan = input[0];

    // Write incoming samples to ring buffer
    for (let i = 0; i < chan.length; i++) {
      this.buf[this.write] = chan[i];
      this.write = (this.write + 1) % this.buf.length;
    }

    // Hop every ~512 samples (128-frame quantum; hop/128 ≈ 4)
    if (currentFrame % Math.floor(this.hop / 128) !== 0) return true;

    // 1) Copy latest frame from ring buffer
    const frame = new Float32Array(this.frameSize);
    const start = (this.write - this.frameSize + this.buf.length) % this.buf.length;
    if (start + this.frameSize <= this.buf.length) {
      frame.set(this.buf.subarray(start, start + this.frameSize));
    } else {
      const first = this.buf.length - start;
      frame.set(this.buf.subarray(start));
      frame.set(this.buf.subarray(0, this.frameSize - first), first);
    }

    // 2) Basic RMS/voicing
    let sum = 0;
    for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
    const rms = Math.sqrt(sum / frame.length);
    if (rms < this.voicingRms) {
      this.port.postMessage({ pitch: null, clarity: 0, rms, centroidHz: null, rolloffHz: null, h1h2: null });
      return true;
    }

    // DC remove + window
    let mean = 0;
    for (let i = 0; i < frame.length; i++) mean += frame[i];
    mean /= frame.length;
    for (let i = 0; i < frame.length; i++) this.re[i] = (frame[i] - mean) * this.window[i];
    this.im.fill(0);

    // 3) FFT → magnitude spectrum (0..N/2)
    fft(this.re, this.im); // in-place
    const N = this.frameSize;
    const sr = sampleRate;
    const bins = N / 2;
    const mag = new Float32Array(bins);
    let energy = 0;
    for (let k = 0; k < bins; k++) {
      const m = Math.hypot(this.re[k], this.im[k]);
      mag[k] = m;
      energy += m * m;
    }

    // 4) Spectral centroid & 85% rolloff
    let sumMag = 0, sumF = 0, acc = 0, rolloffHz = null;
    const binHz = sr / N;
    for (let k = 0; k < bins; k++) {
      const f = k * binHz;
      const m = mag[k];
      sumMag += m;
      sumF += f * m;
    }
    const centroidHz = sumMag > 0 ? (sumF / sumMag) : null;
    const targetEnergy = energy * 0.85;
    for (let k = 0; k < bins; k++) {
      acc += mag[k] * mag[k];
      if (rolloffHz === null && acc >= targetEnergy) {
        rolloffHz = k * binHz;
        break;
      }
    }

    // 5) Autocorrelation for pitch
    const minLag = Math.max(1, Math.floor(sr / this.maxHz));
    const maxLag = Math.min(N - 1, Math.floor(sr / this.minHz));
    let bestLag = -1, best = 0;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < N - lag; i++) {
        corr += frame[i] * frame[i + lag];
      }
      if (corr > best) { best = corr; bestLag = lag; }
    }

    let pitch = null, clarity = 0, h1h2 = null;
    if (bestLag > 0) {
      // Parabolic interpolation
      const prev = acf(frame, bestLag - 1);
      const curr = best;
      const next = acf(frame, bestLag + 1);
      const denom = 2 * (2 * curr - prev - next);
      const shift = denom !== 0 ? (prev - next) / denom : 0;
      const refinedLag = bestLag + shift;
      pitch = sr / refinedLag;
      // Normalize clarity by energy
      clarity = curr / (sum + 1e-9);

      // 6) H1–H2 (resonance proxy) if pitch known
      const f0 = pitch;
      const k1 = Math.round(f0 / binHz);
      const k2 = Math.round((2 * f0) / binHz);
      if (k1 > 0 && k2 > 0 && k1 < bins && k2 < bins) {
        // small neighborhood max for robustness
        const h1 = maxAround(mag, k1, 1);
        const h2 = maxAround(mag, k2, 1);
        const H1 = 20 * Math.log10(h1 + 1e-9);
        const H2 = 20 * Math.log10(h2 + 1e-9);
        h1h2 = H1 - H2; // breathier → larger positive; brighter/tenser → smaller/negative
      }
    }

    this.port.postMessage({ pitch, clarity, rms, centroidHz, rolloffHz, h1h2 });
    return true;
  }
}

function acf(x, lag) {
  if (lag < 1) return 0;
  let c = 0;
  for (let i = 0; i < x.length - lag; i++) c += x[i] * x[i + lag];
  return c;
}

function maxAround(arr, k, r) {
  let m = 0;
  for (let i = Math.max(0, k - r); i <= Math.min(arr.length - 1, k + r); i++) {
    if (arr[i] > m) m = arr[i];
  }
  return m;
}

function hanning(N) {
  const w = new Float32Array(N);
  for (let n = 0; n < N; n++) w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (N - 1));
  return w;
}

// In-place iterative radix-2 FFT (Cooley–Tukey)
function fft(re, im) {
  const N = re.length;
  // bit-reversal
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
    let k = N >> 1;
    while (k <= j) { j -= k; k >>= 1; }
    j += k;
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang), wlenIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < (len >> 1); j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + (len >> 1)] * wRe - im[i + j + (len >> 1)] * wIm;
        const vIm = re[i + j + (len >> 1)] * wIm + im[i + j + (len >> 1)] * wRe;
        re[i + j] = uRe + vRe;    im[i + j] = uIm + vIm;
        re[i + j + (len >> 1)] = uRe - vRe; im[i + j + (len >> 1)] = uIm - vIm;
        // w *= wlen
        const nwRe = wRe * wlenRe - wIm * wlenIm;
        const nwIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nwRe; wIm = nwIm;
      }
    }
  }
}

registerProcessor("pitch-processor", PitchProcessor);
