'use client';

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Resonai</h1>
        <p className="text-muted-foreground">Local-first voice feminization trainer</p>
        <div className="space-y-3">
          <a
            href="/try"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-white shadow hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 font-semibold"
          >
            Start Instant Practice
          </a>
          <a
            href="/start"
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-white shadow hover:bg-black/90 dark:bg-white dark:text-black"
          >
            Begin Voice Journey
          </a>
        </div>
      </div>
    </main>
  );
}
