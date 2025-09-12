'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { micEngine } from '@/engine/audio/mic';

const VoiceCanvas = dynamic(() => import('@/components/VoiceCanvas'), { ssr: false });

export default function ListenPage() {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [science, setScience] = useState(false);
  const [target, setTarget] = useState<[number, number]>([180, 240]);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        setGranted(true);
        await micEngine.start(stream);
      } catch (e) {
        if (!cancelled) setGranted(false);
      }
    }
    go();
    return () => {
      cancelled = true;
      micEngine.stop();
    };
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Microphone check</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={science ? 'default' : 'secondary'}
              onClick={() => setScience((s) => !s)}
            >
              {science ? 'Science: On' : 'Science: Off'}
            </Button>
          </div>
        </div>

        <p className="text-muted-foreground text-sm" aria-live="polite">
          {granted === null && 'Waiting for permission'}
          {granted === true && 'Permission granted. You should see your voice thread below.'}
          {granted === false && 'Permission denied. Please enable microphone access to continue.'}
        </p>

        <div className="bg-background overflow-hidden rounded-lg border">
          <VoiceCanvas targetBandHz={target} science={science} />
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Target band (Hz):</span>
          <Button size="sm" variant="secondary" onClick={() => setTarget([180, 240])}>
            180240
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTarget([200, 260])}>
            200260
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setTarget([220, 280])}>
            220280
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Audio stays on your device; nothing is uploaded.
        </p>
        <div className="pt-2">
          <Button asChild>
            <a href="/practice">Continue to practice</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
