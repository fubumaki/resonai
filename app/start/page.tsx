'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function StartPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-semibold">Ready to begin?</h1>
        <p className="text-muted-foreground">We will ask for microphone permission next.</p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/listen">Yes, continue</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/">Learn more</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
