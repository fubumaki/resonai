'use client';

import { useRef } from 'react';

import AccessibleDialog from './AccessibleDialog';

interface MicPrimerDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function MicPrimerDialog({ isOpen, onAccept, onDecline }: MicPrimerDialogProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onDecline}
      title="Microphone Access"
      description={(
        <div className="space-y-2">
          <p>We use your mic to give you instant feedback during practice.</p>
          <p>You&apos;re in control; recordings stay on your device during practice.</p>
        </div>
      )}
      initialFocusRef={continueButtonRef}
      contentClassName="max-w-sm"
    >
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDecline}
          className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
        >
          Not now
        </button>
        <button
          ref={continueButtonRef}
          onClick={onAccept}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
        >
          Continue
        </button>
      </div>
    </AccessibleDialog>
  );
}
