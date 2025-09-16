class SpectralProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [];
  }
  
  constructor() {
    super();
    this._sampleRate = globalThis.sampleRate ?? 48000;
    const windowSize = 2048; // Larger window for better frequency resolution
    this._buffer = new Float32Array(windowSize);
    this._hop = Math.floor(windowSize / 4); // 75% overlap for smoother analysis
    this._ptr = 0;
    this._window = new Float32Array(windowSize);
    
    // Pre-compute Hann window
    for (let i = 0; i < windowSize; i++) {
      this._window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowSize - 1)));
    }
  }
  
  calculateSpectralCentroid(frame) {
    const N = frame.length;
    const fftSize = N;
    const nyquist = this._sampleRate / 2;
    const binWidth = this._sampleRate / fftSize;
    
    // Apply window function
    const windowedFrame = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      windowedFrame[i] = frame[i] * this._window[i];
    }
    
    // Simple FFT approximation using autocorrelation method
    // For real-time performance, we'll use a simplified approach
    const spectrum = new Float32Array(fftSize / 2);
    
    // Compute power spectrum using autocorrelation
    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / fftSize;
        real += windowedFrame[n] * Math.cos(angle);
        imag += windowedFrame[n] * Math.sin(angle);
      }
      
      spectrum[k] = real * real + imag * imag;
    }
    
    // Calculate spectral centroid
    let weightedSum = 0;
    let totalPower = 0;
    
    for (let k = 1; k < spectrum.length; k++) {
      const frequency = k * binWidth;
      const power = spectrum[k];
      
      weightedSum += frequency * power;
      totalPower += power;
    }
    
    const centroid = totalPower > 0 ? weightedSum / totalPower : 0;
    
    // Normalize to 0-1 range (typical speech range is ~200-4000 Hz)
    const normalizedCentroid = Math.max(0, Math.min(1, (centroid - 200) / 3800));
    
    return normalizedCentroid;
  }
  
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel) return true;
    
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._ptr++] = channel[i];
      if (this._ptr >= this._buffer.length) {
        const brightness = this.calculateSpectralCentroid(this._buffer);
        this.port.postMessage({ brightness });
        
        // Shift buffer for overlap
        this._buffer.copyWithin(0, this._hop);
        this._ptr = this._buffer.length - this._hop;
      }
    }
    return true;
  }
}

registerProcessor('spectral-processor', SpectralProcessor);
