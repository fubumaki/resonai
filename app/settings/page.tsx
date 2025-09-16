'use client';

import { useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import AccessibleDialog from '@/components/AccessibleDialog';
import { exportSessions, deleteAllSessions, importSessions } from '@/flow/sessionStore';

export default function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const {
    Dialog: DeleteAllDialog,
    requestConfirmation: requestDeleteAllConfirmation,
  } = useConfirmDialog({
    title: 'Delete session data?',
    description: 'Removes all stored practice sessions from this browser. This cannot be undone.',
    body: (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Deleting will permanently erase practice history saved on this device.
      </p>
    ),
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete all sessions',
    cancelButtonClassName:
      'px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors',
    confirmButtonClassName:
      'px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors',
    contentClassName: 'max-w-sm',
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const sessionsJson = await exportSessions();
      const blob = new Blob([sessionsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resonai-sessions-v1-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      await importSessions(text);
      alert('Sessions imported successfully!');
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Invalid file format'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await requestDeleteAllConfirmation();
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAllSessions();
      alert('All session data has been deleted.');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DeleteAllDialog confirmDisabled={isDeleting} />

      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Session Data</h2>
            <p className="text-gray-600 mb-6">
              Your practice sessions are stored locally in your browser. You can export them for backup or delete them for privacy.
            </p>

            <div className="space-y-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export Sessions (JSON)'}
              </button>

              <label className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed cursor-pointer text-center block">
                {isImporting ? 'Importing...' : 'Import Sessions (JSON)'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete All Sessions'}
              </button>
            </div>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Navigation</h2>
            <div className="space-y-2">
              <a href="/flow" className="block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-center">
                Start Practice Flow
              </a>
              <a href="/dev/status" className="block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-center">
                Dev Status
              </a>
              <a href="/dev/pitch" className="block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-center">
                Pitch Engine Dev
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

type ConfirmDialogOptions = {
  title: ReactNode;
  description?: ReactNode;
  body?: ReactNode;
  cancelLabel: ReactNode;
  confirmLabel: ReactNode;
  confirmingLabel?: ReactNode;
  cancelButtonClassName?: string;
  confirmButtonClassName?: string;
  contentClassName?: string;
};

type ConfirmDialogRenderProps = {
  confirmDisabled?: boolean;
  isConfirming?: boolean;
};

function useConfirmDialog({
  title,
  description,
  body,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  cancelButtonClassName,
  confirmButtonClassName,
  contentClassName,
}: ConfirmDialogOptions) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback((result: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setIsOpen(false);
    if (resolver) {
      resolver(result);
    }
  }, []);

  const requestConfirmation = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }

    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleCancel = useCallback(() => close(false), [close]);
  const handleConfirm = useCallback(() => close(true), [close]);

  const Dialog = ({ confirmDisabled = false, isConfirming = false }: ConfirmDialogRenderProps = {}) => {
    const resolvedConfirmLabel =
      isConfirming && confirmingLabel !== undefined ? confirmingLabel : confirmLabel;

    return (
      <AccessibleDialog
        isOpen={isOpen}
        onClose={handleCancel}
        title={title}
        description={description}
        initialFocusRef={cancelButtonRef}
        closeOnBackdropClick={false}
        contentClassName={contentClassName}
      >
        <div className="space-y-2">
          {body ?? null}
          <div className="flex justify-end gap-3 pt-2">
            <button
              ref={cancelButtonRef}
              className={cancelButtonClassName}
              onClick={handleCancel}
            >
              {cancelLabel}
            </button>
            <button
              className={confirmButtonClassName}
              onClick={handleConfirm}
              disabled={confirmDisabled || isConfirming}
            >
              {resolvedConfirmLabel}
            </button>
          </div>
        </div>
      </AccessibleDialog>
    );
  };

  return { Dialog, requestConfirmation } as const;
}
