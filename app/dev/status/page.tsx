'use client';
import { useEffect, useState } from 'react';

export default function Status() {
  const [info, setInfo] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    (async () => {
      const simd = await checkSimd();
      const threads = ('SharedArrayBuffer' in window) && (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
      const gpu = 'gpu' in navigator;
      const offscreen = typeof OffscreenCanvas !== 'undefined';
      setInfo({
        crossOriginIsolated: (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true,
        wasmSIMD: simd,
        wasmThreads: threads,
        webGPU: gpu,
        offscreenCanvas: offscreen
      });
    })();
  }, []);
  
  return (
    <main className="dev-main">
      <h1>Dev Status</h1>
      <ul className="dev-list">
        {Object.entries(info).map(([k,v]) => (
          <li key={k}><strong>{k}</strong>: {v ? 'OK' : 'FAIL'}</li>
        ))}
      </ul>
    </main>
  );
}

async function checkSimd(): Promise<boolean> {
  const wasmSimdModule = new Uint8Array([0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,0x01,0x05,0x01,0x60,0x00,0x00,0x03,0x02,0x01,0x00,0x0A,0x09,0x01,0x07,0x00,0xFD,0x00,0,0,0,0,0,0,0,0,0,0,0x0B]);
  try { 
    await WebAssembly.instantiate(wasmSimdModule.buffer); 
    return true; 
  } catch { 
    return false; 
  }
}
