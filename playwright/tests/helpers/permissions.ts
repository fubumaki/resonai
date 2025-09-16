import { Page } from '@playwright/test';

export type PermissionOverrides = Partial<Record<PermissionName | '*', PermissionState>>;

export interface PermissionController {
  /** Merge new overrides with the existing ones. */
  set(overrides: PermissionOverrides): Promise<void>;
  /** Remove overrides for provided keys or reset entirely when omitted. */
  reset(keys?: (PermissionName | '*')[]): Promise<void>;
  /** Inspect current override map for debugging. */
  snapshot(): Promise<PermissionOverrides>;
}

const createStatus = (
  state: PermissionState,
  name: PermissionName = 'geolocation'
): PermissionStatus => ({
  name,
  state,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

/**
 * Overrides navigator.permissions.query so tests can simulate browser consent
 * flows without invoking real permission prompts. The controller can be used
 * to tweak overrides mid-test.
 */
export async function usePermissionMock(
  page: Page,
  overrides: PermissionOverrides = {}
): Promise<PermissionController> {
  await page.addInitScript(initialOverrides => {
    const globalAny = window as any;
    const navAny = navigator as any;
    const permissions: any = navAny.permissions || {};
    const originalQuery = permissions.query?.bind(permissions);

    const state = {
      overrides: { ...initialOverrides },
    };

    const resolveState = (
      descriptor: PermissionDescriptor | any
    ): Promise<PermissionStatus> | PermissionStatus => {
      const name = (descriptor?.name || descriptor) as PermissionName | '*';
      const permissionName: PermissionName =
        name === '*' ? 'geolocation' : name;
      const override = state.overrides[name] ?? state.overrides['*'];

      if (override) {
        return createStatus(override, permissionName);
      }

      if (originalQuery) {
        return originalQuery(descriptor).catch(() =>
          createStatus('denied', permissionName)
        );
      }

      return Promise.resolve(createStatus('prompt', permissionName));
    };

    const query = (descriptor: PermissionDescriptor | any) => {
      const result = resolveState(descriptor);
      return result instanceof Promise ? result : Promise.resolve(result);
    };

    permissions.query = query;
    navAny.permissions = permissions;

    const helper = {
      state,
      set(next: PermissionOverrides) {
        state.overrides = { ...state.overrides, ...next };
      },
      reset(keys?: (PermissionName | '*')[]) {
        if (!keys) {
          state.overrides = {};
          return;
        }
        keys.forEach(key => {
          delete state.overrides[key];
        });
      },
      snapshot() {
        return { ...state.overrides };
      },
    };

    globalAny.__PERMISSION_HELPER__ = helper;
  }, overrides);

  const exec = async <T>(action: 'set' | 'reset' | 'snapshot', payload?: unknown): Promise<T> => {
    return page.evaluate(({ action, payload }) => {
      const helper = (window as any).__PERMISSION_HELPER__;
      if (!helper) {
        if (action === 'snapshot') {
          return {};
        }
        return undefined;
      }

      if (action === 'set') {
        helper.set(payload || {});
        return undefined;
      }

      if (action === 'reset') {
        helper.reset(payload || undefined);
        return undefined;
      }

      return helper.snapshot();
    }, { action, payload }) as T;
  };

  return {
    set(next: PermissionOverrides) {
      return exec('set', next);
    },
    reset(keys?: (PermissionName | '*')[]) {
      return exec('reset', keys ?? undefined);
    },
    snapshot() {
      return exec('snapshot') as Promise<PermissionOverrides>;
    },
  };
}

