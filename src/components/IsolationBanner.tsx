'use client';
export default function IsolationBanner({ isolated }: { isolated: boolean }) {
  if (isolated) return null;
  return (
    <div role="alert" aria-live="polite"
         style={{padding:'8px 12px', background:'#fff3cd', border:'1px solid #ffeeba', borderRadius:8}}>
      Advanced performance features are temporarily unavailable. You can still practice (fallback detector active).
      Try a hard refresh or check the Dev Status page for details.
    </div>
  );
}
