export const metadata = {
  title: "Data & Privacy - Resonai",
  description: "What the app stores locally and what it never stores.",
};

export default function DataPrivacy() {
  return (
    <section className="hero">
      <h1>Data & Privacy</h1>
      <div className="panel col gap-2">
        <p><strong>Local‑first by design.</strong> Your audio never leaves your device. Analysis runs entirely in your browser.</p>

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
            <li><strong>No analytics beacons.</strong> The app doesn&apos;t transmit usage data.</li>
          </ul>
        </div>

        <p className="badge">You may export or clear your local trials at any time from the Practice page.</p>
      </div>
    </section>
  );
}
