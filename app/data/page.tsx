export const metadata = {
  title: "Data & Privacy - Resonai",
  description: "What the app stores locally and what it never stores.",
};

export default function DataPrivacy() {
  return (
    <section className="hero">
      <h1>Data & Privacy</h1>
      <div className="panel col gap-2">
        <p><strong>Local-first by design.</strong> Your audio never leaves your device. Analysis runs entirely in your browser.</p>

        <div className="panel panel--dashed">
          <strong>Stored locally (IndexedDB)</strong>
          <ul>
            <li><strong>Settings:</strong> chosen profile (Alto/Mezzo/Soprano/Custom), target ranges, low-power mode, selected microphone and constraint toggles.</li>
            <li><strong>Recent trials (last 20):</strong> phrase, score, median pitch/brightness, in-range percentages, stability, timestamp, and the target ranges used.</li>
          </ul>
        </div>

        <div className="panel panel--dashed">
          <strong>Not stored / Not sent</strong>
          <ul>
            <li><strong>No audio recordings.</strong> We do not save or upload audio.</li>
            <li><strong>No account data.</strong> No sign-up, passwords, or email.</li>
            <li>
              <strong>Usage telemetry (screen views, mic permission prompts/outcomes, mic sessions, time-to-voice, activation, session progress).</strong>
              These events stay in-memory while the tab is open and are batch-posted as JSON to <code>/api/events</code>; session progress events are also mirrored in-memory for QA tools. No audio or identifiers are included.
            </li>
          </ul>
        </div>

        <p className="badge">You may export or clear your local trials at any time from the Practice page.</p>
      </div>
    </section>
  );
}
