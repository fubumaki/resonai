// src/coach/environmentAware.ts
// Environment-aware guidance for isolation, device changes, and system health

import { CoachHint } from './types';
import { COPY } from './copy';

export interface EnvironmentState {
  isIsolated: boolean;
  deviceChanged: boolean;
  enhancementsOn: boolean;
  audioContextState: 'running' | 'suspended' | 'closed';
  sampleRate: number;
  lastDeviceId?: string;
}

export class EnvironmentAwareCoach {
  private lastEnvironmentHint: string | null = null;
  private lastEnvironmentHintTime = 0;
  private readonly COOLDOWN_MS = 10000; // 10 seconds between environment hints

  checkEnvironment(state: EnvironmentState): CoachHint[] {
    const hints: CoachHint[] = [];
    const now = Date.now();

    // Rate limit environment hints
    if (now - this.lastEnvironmentHintTime < this.COOLDOWN_MS) {
      return hints;
    }

    // Check isolation status
    if (!state.isIsolated) {
      const hint = this.createIsolationHint();
      if (hint && hint.id !== this.lastEnvironmentHint) {
        hints.push(hint);
        this.lastEnvironmentHint = hint.id;
        this.lastEnvironmentHintTime = now;
      }
    }

    // Check device changes
    if (state.deviceChanged) {
      const hint = this.createDeviceChangeHint();
      if (hint && hint.id !== this.lastEnvironmentHint) {
        hints.push(hint);
        this.lastEnvironmentHint = hint.id;
        this.lastEnvironmentHintTime = now;
      }
    }

    // Check audio enhancements
    if (state.enhancementsOn) {
      const hint = this.createEnhancementsHint();
      if (hint && hint.id !== this.lastEnvironmentHint) {
        hints.push(hint);
        this.lastEnvironmentHint = hint.id;
        this.lastEnvironmentHintTime = now;
      }
    }

    // Check audio context state
    if (state.audioContextState === 'suspended') {
      const hint = this.createAudioContextHint();
      if (hint && hint.id !== this.lastEnvironmentHint) {
        hints.push(hint);
        this.lastEnvironmentHint = hint.id;
        this.lastEnvironmentHintTime = now;
      }
    }

    // Check sample rate
    if (state.sampleRate !== 48000) {
      const hint = this.createSampleRateHint(state.sampleRate);
      if (hint && hint.id !== this.lastEnvironmentHint) {
        hints.push(hint);
        this.lastEnvironmentHint = hint.id;
        this.lastEnvironmentHintTime = now;
      }
    }

    return hints;
  }

  private createIsolationHint(): CoachHint {
    return {
      id: 'isolation-dropped',
      text: COPY.isolationDropped,
      severity: 'warning' as const,
      priority: 1,
      aria: COPY.isolationDropped
    };
  }

  private createDeviceChangeHint(): CoachHint {
    return {
      id: 'device-changed',
      text: COPY.deviceChanged,
      severity: 'info' as const,
      priority: 2,
      aria: COPY.deviceChanged
    };
  }

  private createEnhancementsHint(): CoachHint {
    return {
      id: 'enhancements-on',
      text: COPY.enhancementsOn,
      severity: 'info' as const,
      priority: 2,
      aria: COPY.enhancementsOn
    };
  }

  private createAudioContextHint(): CoachHint {
    return {
      id: 'audio-context-suspended',
      text: 'Audio context suspended—click to resume',
      severity: 'warning' as const,
      priority: 1,
      aria: 'Audio context suspended, click to resume'
    };
  }

  private createSampleRateHint(actualRate: number): CoachHint {
    return {
      id: 'sample-rate-mismatch',
      text: `Sample rate is ${actualRate}Hz instead of 48000Hz—this may affect accuracy`,
      severity: 'warning' as const,
      priority: 1,
      aria: `Sample rate is ${actualRate}Hz instead of 48000Hz, this may affect accuracy`
    };
  }

  // Helper to detect if Windows audio enhancements are on
  static async detectAudioEnhancements(): Promise<boolean> {
    try {
      // This is a simplified check - in practice you'd need more sophisticated detection
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
        } 
      });
      
      // Check if we can get the actual constraints
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();
      
      // If echo cancellation or noise suppression are enabled despite our request,
      // it might indicate Windows enhancements are on
      const hasEnhancements = settings.echoCancellation || settings.noiseSuppression;
      
      // Clean up
      stream.getTracks().forEach(track => track.stop());
      
      return hasEnhancements ?? false;
    } catch (error) {
      console.warn('Could not detect audio enhancements:', error);
      return false;
    }
  }

  // Helper to get current environment state
  static async getEnvironmentState(): Promise<EnvironmentState> {
    const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
    
    const deviceChanged = false;
    let sampleRate = 48000;
    let audioContextState: 'running' | 'suspended' | 'closed' = 'closed';
    
    try {
      // Check audio context state
      const audioContext = new (window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      audioContextState = audioContext.state as 'running' | 'suspended' | 'closed';
      sampleRate = audioContext.sampleRate;
      audioContext.close();
    } catch (error) {
      console.warn('Could not check audio context:', error);
    }

    const enhancementsOn = await this.detectAudioEnhancements();

    return {
      isIsolated,
      deviceChanged,
      enhancementsOn,
      audioContextState,
      sampleRate
    };
  }
}
