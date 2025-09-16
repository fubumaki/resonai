import { Page } from '@playwright/test';

export type LocalStorageValue = string | number | boolean | null;

export interface LocalStorageController {
  /** Apply (and persist) new values for the provided keys. */
  set(values: Record<string, LocalStorageValue>): Promise<void>;
  /** Remove keys or clear the entire store when keys are omitted. */
  clear(keys?: string[]): Promise<void>;
  /** Capture a snapshot of the current localStorage contents. */
  snapshot(): Promise<Record<string, string | null>>;
}

/**
 * Injects a small runtime controller that applies the provided flags before
 * the app loads. Subsequent calls can tweak flags or clear the store during a
 * test without having to re-register scripts.
 */
export async function useLocalStorageFlags(
  page: Page,
  initial: Record<string, LocalStorageValue> = {}
): Promise<LocalStorageController> {
  await page.addInitScript(flags => {
    const globalAny = window as any;

    const ensureStorage = () => {
      try {
        return window.localStorage;
      } catch (error) {
        console.warn('localStorage unavailable in this context', error);
        return undefined;
      }
    };

    const storage = ensureStorage();

    const serialiseValue = (value: LocalStorageValue) => {
      if (value === null) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      try {
        return JSON.stringify(value);
      } catch (error) {
        console.warn('Failed to serialise localStorage value', error);
        return null;
      }
    };

    const apply = (values: Record<string, LocalStorageValue>) => {
      if (!storage) return;
      Object.entries(values || {}).forEach(([key, raw]) => {
        if (raw === undefined) return;
        if (raw === null) {
          storage.removeItem(key);
          return;
        }
        const serialised = serialiseValue(raw);
        if (serialised !== null) {
          storage.setItem(key, serialised);
        }
      });
    };

    const clear = (keys?: string[]) => {
      if (!storage) return;
      if (!keys) {
        storage.clear();
        return;
      }
      keys.forEach(key => storage.removeItem(key));
    };

    const snapshot = () => {
      const result: Record<string, string | null> = {};
      if (!storage) {
        return result;
      }

      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key) {
          result[key] = storage.getItem(key);
        }
      }

      return result;
    };

    const helper = globalAny.__LOCAL_STORAGE_HELPER__ || {
      apply,
      clear,
      snapshot,
      defaults: {} as Record<string, LocalStorageValue>,
    };

    helper.defaults = { ...helper.defaults, ...flags };
    helper.apply(helper.defaults);

    globalAny.__LOCAL_STORAGE_HELPER__ = helper;
  }, initial);

  const exec = async <T>(action: 'set' | 'clear' | 'snapshot', payload?: unknown): Promise<T> => {
    return page.evaluate(({ action, payload }) => {
      const helper = (window as any).__LOCAL_STORAGE_HELPER__;
      if (!helper) {
        if (action === 'snapshot') {
          return {};
        }
        return undefined;
      }

      if (action === 'set') {
        helper.apply(payload || {});
        helper.defaults = { ...helper.defaults, ...(payload || {}) };
        return undefined;
      }

      if (action === 'clear') {
        helper.clear(payload || undefined);
        if (Array.isArray(payload)) {
          const keys: string[] = payload as string[];
          keys.forEach((key: string) => {
            delete helper.defaults[key];
          });
        } else {
          helper.defaults = {};
        }
        return undefined;
      }

      return helper.snapshot();
    }, { action, payload }) as T;
  };

  return {
    set(values: Record<string, LocalStorageValue>) {
      return exec('set', values);
    },
    clear(keys?: string[]) {
      return exec('clear', keys ?? undefined);
    },
    snapshot() {
      return exec('snapshot') as Promise<Record<string, string | null>>;
    },
  };
}

