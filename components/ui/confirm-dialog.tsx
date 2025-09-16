'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './button';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Dialog description/content */
  description?: string;
  /** Text for the confirm button */
  confirmText?: string;
  /** Text for the cancel button */
  cancelText?: string;
  /** Variant for the confirm button */
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Whether the confirm action is loading */
  loading?: boolean;
  /** Whether to show the dialog as a modal (with backdrop) */
  modal?: boolean;
}

const FOCUS_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'default',
  onConfirm,
  loading = false,
  modal = true
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocus = useRef<HTMLElement | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when dialog opens
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Handle focus management and keyboard navigation
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUS_SELECTOR);
    firstFocus.current = focusables[0] || null;
    lastFocus.current = focusables[focusables.length - 1] || null;

    // Focus the first focusable element
    firstFocus.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && focusables.length > 1) {
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === firstFocus.current) {
          e.preventDefault();
          lastFocus.current?.focus();
        } else if (!e.shiftKey && active === lastFocus.current) {
          e.preventDefault();
          firstFocus.current?.focus();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modal && !dialog.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    if (modal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (modal) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [open, modal, onClose]);

  // Restore focus when dialog closes
  useEffect(() => {
    if (!open && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  // Handle body scroll lock when modal is open
  useEffect(() => {
    if (open && modal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open, modal]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <>
      {modal && (
        <div 
          className="confirm-dialog-backdrop"
          aria-hidden="true"
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal={modal}
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="confirm-dialog"
      >
        <div className="confirm-dialog-content">
          <h2 id="confirm-dialog-title" className="confirm-dialog-title">
            {title}
          </h2>
          {description && (
            <p id="confirm-dialog-description" className="confirm-dialog-description">
              {description}
            </p>
          )}
          <div className="confirm-dialog-actions">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Loading...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for easier usage
export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'open' | 'onClose'> | null>(null);

  const confirm = (props: Omit<ConfirmDialogProps, 'open' | 'onClose'>) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...props,
        onConfirm: () => {
          props.onConfirm();
          resolve(true);
        }
      });
      setOpen(true);
    });
  };

  const close = () => {
    setOpen(false);
    setConfig(null);
  };

  return {
    confirm,
    ConfirmDialog: config ? (
      <ConfirmDialog
        open={open}
        onClose={close}
        {...config}
      />
    ) : null
  };
}
