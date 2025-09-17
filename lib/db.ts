'use client';

import Dexie from 'dexie';

export type PresetKey = 'alto' | 'mezzo' | 'soprano' | 'custom';

export type SettingsRow = {
  id: string;                // 'default'
  preset: PresetKey;
  pitchMin: number;
  pitchMax: number;
  brightMin: number;
  brightMax: number;
  lowPower: boolean;

  // NEW: audio device + constraints
  inputDeviceId: string | null;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
};

export type TrialRow = {
  id?: number;
  ts: number;
  phrase: string;
  // targets used during the trial (for context)
  pitchMin: number;
  pitchMax: number;
  brightMin: number;
  brightMax: number;
  // results
  medianPitch: number | null;
  medianCentroid: number | null;
  inPitchPct: number;
  inBrightPct: number;
  pitchStabilityHz: number | null;
  score: number; // 0..100
};

export const defaultSettings: SettingsRow = {
  id: 'default',
  preset: 'mezzo',
  pitchMin: 180,
  pitchMax: 220,
  brightMin: 1800,
  brightMax: 2800,
  lowPower: false,

  inputDeviceId: null,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

class ResonaiDB extends Dexie {
  trials!: Dexie.Table<TrialRow, number>;
  settings!: Dexie.Table<SettingsRow, string>;
  constructor() {
    super('resonai');
    // v1 -> v2 adds audio settings fields
    this.version(1).stores({
      trials: '++id, ts',
      settings: 'id',
    });
    this.version(2).stores({
      trials: '++id, ts',
      settings: 'id',
    }).upgrade(async (tx) => {
      const table = tx.table<SettingsRow, string>('settings');
      await table.toCollection().modify((s) => {
        (s as any).inputDeviceId ??= null;
        (s as any).echoCancellation ??= false;
        (s as any).noiseSuppression ??= false;
        (s as any).autoGainControl ??= false;
      });
    });
  }
}

export const db = typeof window === 'undefined' ? ({} as any) : new ResonaiDB();