'use client';

import { useEffect, useRef, useState } from 'react';

interface MicPrimerDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function MicPrimerDialog({ isOpen, onAccept, onDecline }: MicPrimerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setIsVisible(true);
      
      // Focus the continue button for keyboard users
      setTimeout(() => {
        const continueButton = dialogRef.current?.querySelector('[data-primary]') as HTMLButtonElement;
        continueButton?.focus();
      }, 100);
    } else {
      setIsVisible(false);
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDecline();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onDecline();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm mx-auto shadow-xl border-0"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby="primer-title"
      aria-describedby="primer-description"
      aria-modal="true"
    >
      <div className="space-y-4">
        <h2 
          id="primer-title" 
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          Microphone Access
        </h2>
        
        <div id="primer-description" className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>We use your mic to give you instant feedback during practice.</p>
          <p>You&apos;re in control; recordings stay on your device during practice.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
          >
            Not now
          </button>
          <button
            data-primary
            onClick={onAccept}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </dialog>
  );
}
