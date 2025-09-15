'use client';
import { useEffect, useState } from 'react';

type Check = { label: string; ok: boolean; detail?: string };
const Row = ({c}:{c:Check}) => <li><strong>{c.label}:</strong> {c.ok?'OK':'FAIL'} {c.detail? ` - ${c.detail}`:''}</li>;

export default function EnvPage() {
  const [checks,setChecks] = useState<Check[]>([]);
  useEffect(() => { (async () => {
    const iso = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
    const sab = typeof SharedArrayBuffer !== 'undefined';
    const simd = await checkSimd();
    const threads = iso && sab;
    const ort = await checkModel('/models/crepe-tiny.onnx');
    const { ec, ns, agc, inRate } = await checkMicConstraints();
    const acRate = await getACSampleRate();

    setChecks([
      { label:'Cross-origin isolated', ok: iso },
      { label:'SharedArrayBuffer', ok: sab },
      { label:'WASM SIMD', ok: simd },
      { label:'WASM threads (SAB)', ok: threads },
      { label:'CREPE model available', ok: ort, detail:'/models/crepe-tiny.onnx' },
      { label:'Mic echoCancellation OFF', ok: ec === false },
      { label:'Mic noiseSuppression OFF', ok: ns === false },
      { label:'Mic autoGainControl OFF', ok: agc === false },
      { label:'Mic sampleRate', ok: true, detail: inRate? `${inRate} Hz` : '-' },
      { label:'AudioContext sampleRate', ok: true, detail: acRate? `${acRate} Hz` : '-' }
    ]);
  })(); }, []);

  return (
    <main className="dev-main">
      <h1>Environment Report</h1>
      <ul className="dev-list">{checks.map((c,i)=><Row key={i} c={c}/>)}</ul>
      {!checks.find(c=>c.label==='Cross-origin isolated')?.ok &&
        <p role="alert">Performance mode disabled. Running fallback detector (YIN). See Dev Status for COOP/COEP tips.</p>}
    </main>
  );
}

async function checkSimd(){ // tiny SIMD probe
  const m = new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,0,3,2,1,0,10,9,1,7,0,253,0,0,0,0,0,0,0,0,0,0,11]);
  try { await WebAssembly.instantiate(m.buffer); return true; } catch { return false; }
}
async function checkModel(url:string){ try { const r = await fetch(url, {cache:'no-store'}); return r.ok; } catch { return false; } }
async function checkMicConstraints(){
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    const st = s.getAudioTracks()[0]?.getSettings() ?? {};
    const vals = { ec: st.echoCancellation, ns: st.noiseSuppression, agc: st.autoGainControl, inRate: st.sampleRate };
    s.getTracks().forEach(t=>t.stop());
    return vals;
  } catch { return { ec:undefined, ns:undefined, agc:undefined, inRate:undefined }; }
}
async function getACSampleRate(){
  try { const ac = new AudioContext({ latencyHint: 0 }); const r = ac.sampleRate; await ac.close(); return r; } catch { return undefined; }
}
