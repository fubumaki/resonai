'use client';

import { useEffect, useState } from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
}

export default function AccessibilityAnnouncer({ message, priority = 'polite' }: AccessibilityAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (message) {
      setAnnouncement(message);
      // Clear the message after a brief delay to allow for re-announcement
      const timer = setTimeout(() => setAnnouncement(''), 100);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {announcement}
    </div>
  );
}
