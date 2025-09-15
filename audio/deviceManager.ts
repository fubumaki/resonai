interface DeviceChangeCallback {
  (): void;
}

class DeviceManager {
  private callbacks: DeviceChangeCallback[] = [];
  private isListening = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return;
    }

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', () => {
      console.log('Audio device changed');
      this.notifyCallbacks();
    });

    this.isListening = true;
  }

  onDeviceChange(callback: DeviceChangeCallback): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Device change callback error:', error);
      }
    });
  }

  async checkDeviceStatus(): Promise<{ 
    hasAudio: boolean; 
    deviceCount: number;
    currentDevice?: MediaDeviceInfo;
  }> {
    if (!navigator.mediaDevices) {
      return { hasAudio: false, deviceCount: 0 };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      return {
        hasAudio: audioInputs.length > 0,
        deviceCount: audioInputs.length,
        currentDevice: audioInputs[0]
      };
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return { hasAudio: false, deviceCount: 0 };
    }
  }

  destroy() {
    this.callbacks = [];
    this.isListening = false;
  }
}

// Singleton instance
export const deviceManager = new DeviceManager();
