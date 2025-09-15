"use client";

// Small CSP-safe HUD to show deployed commit and environment
// Uses classes from app/ui.css (no inline styles per guardrails)

export default function CommitHud() {
  const sha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "";
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "dev";
  if (!sha) return null;
  const short = sha.slice(0, 7);

  return (
    <div className="commit-hud mono-ellipsis" aria-hidden>
      <span className="text-muted">commit</span> {short}
      <span className="ml-8 text-muted">env</span> {env}
    </div>
  );
}

