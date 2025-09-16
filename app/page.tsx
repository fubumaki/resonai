export default function Home() {
  return (
    <main>
      <section className="hero">
        <span className="badge">Private • Local-first • Pilot</span>
        <h1>Train your voice with instant feedback - no uploads, no account. 🚀✨</h1>
        <p>Click "Start practice" to calibrate your mic, pick a target profile, and try your first phrase in under a minute.</p>
        <p>
          <a className="button" href="/practice">Start practice (no sign-up)</a>
        </p>
        <div className="grid">
          <div className="panel span6">
            <strong>Listen</strong>
            <p>Hear example phrases and feel the target resonance, pitch, and intonation patterns.</p>
            <a href="/listen">Open Listen</a>
          </div>
          <div className="panel span6">
            <strong>Practice</strong>
            <p>Speak and get real-time feedback on pitch and brightness. Speak naturally for continuous analysis.</p>
            <a href="/practice">Open Practice</a>
          </div>
        </div>
      </section>
    </main>
  );
}
