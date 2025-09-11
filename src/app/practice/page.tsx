'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PracticePage() {
  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Practice (MVP)</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Warmup</CardTitle>
            </CardHeader>
            <CardContent className="space-x-2">
              <Button>Breath</Button>
              <Button>Hum</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pitch band</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Placeholder drills coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
