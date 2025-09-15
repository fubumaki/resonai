'use client';
export default function IsolationBanner({ isolated }: { isolated: boolean }) {
  if (isolated) return null;
  return (
    <div role="alert" aria-live="polite" className="banner-warning">
      Advanced performance features are temporarily unavailable. You can still practice (fallback detector active).
      Try a hard refresh or check the Dev Status page for details.
    </div>
  );
}
