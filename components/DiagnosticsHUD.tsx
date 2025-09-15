'use client';
import { useEffect, useState } from 'react';

interface DiagnosticsState {
  iso: boolean;
  simd: boolean;
  threads: boolean;
  hz: number | null;
  semi: number | null;
  jitter: number | null;
}

export default function DiagnosticsHUD({ engine }: { engine: unknown }) {
  const [state, setState] = useState<DiagnosticsState>({ 
    iso: false, 
    simd: false, 
    threads: false, 
    hz: null, 
    semi: null, 
    jitter: null 
  });

  useEffect(() => {
    const iso = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
    (async () => {
      const simd = await checkSimd();
      const threads = typeof SharedArrayBuffer !== 'undefined' && iso;
      setState(s => ({ ...s, iso, simd, threads }));
    })();
    
    const id = setInterval(() => {
      const last = (engine as unknown as { __last?: { pitchHz?: number | null; semitoneRel?: number | null; metrics?: { jitterEma?: number | null } } }).__last ?? null;
      if (last) {
        setState(s => ({ 
          ...s, 
          hz: last.pitchHz ?? null, 
          semi: last.semitoneRel ?? null, 
          jitter: last.metrics?.jitterEma ?? null 
        }));
      }
    }, 100);
    
    return () => clearInterval(id);
  }, [engine]);

  return (
    <div className="overlay-fixed">
      <div>ISO: {state.iso ? 'OK' : 'FAIL'} SIMD: {state.simd ? 'OK' : 'FAIL'} THR: {state.threads ? 'OK' : 'FAIL'}</div>
      <div>Hz: {state.hz ? state.hz.toFixed(1) : '-'}  Semi: {state.semi ? state.semi.toFixed(2) : '-'}</div>
      <div>Jitter EMA: {state.jitter != null ? state.jitter.toFixed(3) : '-'}</div>
    </div>
  );
}

async function checkSimd(): Promise<boolean> {
  const mod = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,0,3,2,1,0,10,9,1,7,0,253,0,0,0,0,0,0,0,0,0,0,11]);
  try { 
    await WebAssembly.instantiate(mod.buffer); 
    return true; 
  } catch { 
    return false; 
  }
}
