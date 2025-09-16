'use client';

import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { PERMISSION_PRIMER_COPY } from '@/lib/permission-primer';

interface MicPrimerDialogProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function MicPrimerDialog({ isOpen, onAccept, onDecline }: MicPrimerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = PERMISSION_PRIMER_COPY;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    let focusTimer: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
      }

      // Focus the continue button for keyboard users
      focusTimer = setTimeout(() => {
        const continueButton = dialog.querySelector('[data-primary]') as HTMLButtonElement | null;
        continueButton?.focus();
      }, 100);
    } else if (dialog.open) {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    }

    return () => {
      if (focusTimer) {
        clearTimeout(focusTimer);
      }
      if (dialog.open) {
        if (typeof dialog.close === 'function') {
          dialog.close();
        } else {
          dialog.removeAttribute('open');
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onDecline();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onDecline]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      onDecline();
    }
  };

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      onDecline();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm bg-white dark:bg-slate-900 rounded-lg p-6 max-w-sm mx-auto shadow-xl border-0"
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby={copy.aria.titleId}
      aria-describedby={copy.aria.descriptionId}
      aria-modal={isOpen}
      aria-hidden={!isOpen}
      data-state={isOpen ? 'open' : 'closed'}
    >
      <div className="space-y-4">
        <h2
          id={copy.aria.titleId}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {copy.title}
        </h2>

        <div
          id={copy.aria.descriptionId}
          className="space-y-2 text-sm text-slate-600 dark:text-slate-300"
        >
          {copy.body.map((paragraph, index) => (
            <p key={`${copy.aria.descriptionId}-${index}`}>{paragraph}</p>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
          >
            {copy.actions.secondary}
          </button>
          <button
            data-primary
            onClick={onAccept}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors"
          >
            {copy.actions.primary}
          </button>
        </div>
      </div>
    </dialog>
  );
}
