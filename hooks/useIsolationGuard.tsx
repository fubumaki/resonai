'use client';
import { useEffect, useState } from 'react';

export function useIsolationGuard() {
  const [isolated, setIsolated] = useState<boolean>(false);
  const [threads, setThreads] = useState<boolean>(false);

  useEffect(() => {
    const iso = (self as unknown as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
    setIsolated(iso);
    setThreads(iso && typeof SharedArrayBuffer !== 'undefined');
  }, []);
  return { isolated, threads };
}
