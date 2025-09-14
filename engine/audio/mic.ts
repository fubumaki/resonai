export type TelemetrySample = {
  ts: number;
  f0Hz: number | null;
  f0Conf: number;
  f1: number | null;
  f2: number | null;
  rms: number;
  hfLf: number;
};

export class MicEngine {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pitchNode: AudioWorkletNode | null = null;
  private energyNode: AudioWorkletNode | null = null;
  private lpcNode: AudioWorkletNode | null = null;

  private latest: TelemetrySample = {
    ts: 0,
    f0Hz: null,
    f0Conf: 0,
    f1: null,
    f2: null,
    rms: 0,
    hfLf: 0,
  };

  private listeners = new Set<(s: TelemetrySample) => void>();
  private emit = (partial: Partial<TelemetrySample>) => {
    this.latest = { ...this.latest, ...partial, ts: performance.now() };
    for (const l of this.listeners) l(this.latest);
  };

  subscribe(listener: (s: TelemetrySample) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get isRunning(): boolean {
    return !!this.context;
  }

  async start(stream: MediaStream): Promise<void> {
    if (this.context) return;
    const getAudioContextCtor = (): typeof AudioContext => {
      const w = globalThis as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      return (w.AudioContext ?? w.webkitAudioContext)!;
    };
    const context = new (getAudioContextCtor())();
    this.context = context;

    await context.audioWorklet.addModule('/worklets/pitch-processor.js');
    await context.audioWorklet.addModule('/worklets/energy-processor.js');
    await context.audioWorklet.addModule('/worklets/lpc-processor.js');

    const source = context.createMediaStreamSource(stream);
    this.source = source;

    this.pitchNode = new AudioWorkletNode(context, 'pitch-processor');
    this.energyNode = new AudioWorkletNode(context, 'energy-processor');
    this.lpcNode = new AudioWorkletNode(context, 'lpc-processor');

    // Route to a silent gain to keep processors active without monitoring audio
    const silent = context.createGain();
    silent.gain.value = 0;

    source.connect(this.pitchNode).connect(silent).connect(context.destination);
    source.connect(this.energyNode).connect(silent);
    source.connect(this.lpcNode).connect(silent);

    this.pitchNode.port.onmessage = (e) => this.emit(e.data);
    this.energyNode.port.onmessage = (e) => this.emit(e.data);
    this.lpcNode.port.onmessage = (e) => this.emit(e.data);
  }

  async stop(): Promise<void> {
    if (!this.context) return;
    this.pitchNode?.disconnect();
    this.energyNode?.disconnect();
    this.lpcNode?.disconnect();
    this.source?.disconnect();
    await this.context.close();
    this.context = null;
    this.source = null;
    this.pitchNode = this.energyNode = this.lpcNode = null;
  }
}

export const micEngine = new MicEngine();

export function hzToSemitoneOffset(hz: number, refHz: number): number {
  return 12 * Math.log2(hz / refHz);
}
