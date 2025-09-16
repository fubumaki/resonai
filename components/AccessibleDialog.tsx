'use client';

import { createPortal } from 'react-dom';
import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  dialogClassName?: string;
  contentClassName?: string;
  labelledBy?: string;
  describedBy?: string;
  closeOnBackdropClick?: boolean;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export default function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  initialFocusRef,
  dialogClassName,
  contentClassName,
  labelledBy,
  describedBy,
  closeOnBackdropClick = true,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const defaultLabelId = useId();
  const defaultDescriptionId = useId();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted || !isOpen) {
      return undefined;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch (error) {
        dialog.setAttribute('open', 'true');
      }
    }

    const focusTarget = () => {
      const candidates = getFocusableElements(dialog);
      const target = initialFocusRef?.current ?? candidates[0] ?? dialog;
      if (target) {
        target.focus({ preventScroll: true });
      }
    };

    const frame = window.requestAnimationFrame(focusTarget);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    const handleBackdrop = (event: MouseEvent) => {
      if (!closeOnBackdropClick) {
        return;
      }

      if (event.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('mousedown', handleBackdrop);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.cancelAnimationFrame(frame);
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('mousedown', handleBackdrop);
      document.body.style.overflow = originalOverflow;

      if (dialog.open) {
        dialog.close();
      }

      const restoreTarget = previousFocusRef.current;
      previousFocusRef.current = null;
      if (restoreTarget) {
        window.requestAnimationFrame(() => {
          if (restoreTarget.isConnected) {
            restoreTarget.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [closeOnBackdropClick, initialFocusRef, isOpen, mounted, onClose]);

  if (!mounted || !isOpen) {
    return null;
  }

  const finalLabelledBy = labelledBy ?? defaultLabelId;
  const finalDescribedBy = describedBy ?? (description ? defaultDescriptionId : undefined);
  const mergedDialogClassName = [
    'accessible-dialog border-0 bg-transparent p-0 m-0 max-w-lg w-full backdrop:bg-black/50 backdrop:backdrop-blur-sm',
    dialogClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const mergedContentClassName = [
    'accessible-dialog__panel mx-auto w-full max-w-lg rounded-lg bg-white dark:bg-slate-900 p-6 shadow-xl focus:outline-none',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <dialog
      ref={dialogRef}
      className={mergedDialogClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby={finalLabelledBy}
      aria-describedby={finalDescribedBy}
      tabIndex={-1}
    >
      <div role="document" className={mergedContentClassName}>
        <div className="space-y-4">
          <h2 id={finalLabelledBy} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {description ? (
            <div id={finalDescribedBy} className="text-sm text-slate-600 dark:text-slate-300">
              {description}
            </div>
          ) : null}
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </dialog>,
    document.body
  );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.tabIndex !== -1
  );
}
