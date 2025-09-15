export default function Listen() {
  return (
    <section className="hero">
      <h1>Listen</h1>
      <div className="panel">
        <p>Hear target examples for pitch, brightness, and intonation. Coming next: A/B compare and adjustable targets.</p>
        <audio controls preload="metadata" className="w-full">
          <source src="/samples/example-phrase-01.mp3" type="audio/mpeg" />
        </audio>
      </div>
    </section>
  );
}