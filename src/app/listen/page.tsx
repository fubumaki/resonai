'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const VoiceCanvas = dynamic(() => import('@/components/VoiceCanvas'), { ssr: false });

export default function ListenPage() {
  const [granted, setGranted] = useState<boolean | null>(null);

  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Microphone check</h1>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {granted === null && 'Waiting for permission'}
          {granted === true && 'Permission granted. You should see your voice thread below.'}
          {granted === false && 'Permission denied. Please enable microphone access to continue.'}
        </p>
        <div className="bg-background rounded-lg border">
          <VoiceCanvas onPermissionChange={setGranted} />
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
