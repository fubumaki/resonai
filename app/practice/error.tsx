"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="hero">
      <h1>Something went wrong</h1>
      <div className="panel" role="alert">{error.message}</div>
      <div className="flex gap-8 mt-8">
        <button className="button" onClick={() => reset()}>Try again</button>
        <button className="button" onClick={() => location.reload()}>Reload</button>
      </div>
      <p className="badge">Tip: check microphone permissions in your browser settings.</p>
    </section>
  );
}
