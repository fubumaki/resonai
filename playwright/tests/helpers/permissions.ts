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

type PermissionHelperState = {
  overrides: PermissionOverrides;
};

type PermissionHelper = {
  state: PermissionHelperState;
  set(next: PermissionOverrides): void;
  reset(keys?: (PermissionName | '*')[]): void;
  snapshot(): PermissionOverrides;
};

type PermissionsLike = {
  query?: Permissions['query'];
} & Record<string, unknown>;

declare global {
  interface Window {
    __PERMISSION_HELPER__?: PermissionHelper;
  }
}

const createStatus = (
  name: PermissionName,
  state: PermissionState
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
    const globalWithHelper = window as Window & {
      __PERMISSION_HELPER__?: PermissionHelper;
    };
    const navigatorWithPermissions = navigator as Navigator & {
      permissions?: PermissionsLike;
    };
    const permissions = (navigatorWithPermissions.permissions ?? {}) as PermissionsLike;
    const originalQuery = permissions.query?.bind(permissions);

    const state: PermissionHelperState = {
      overrides: { ...initialOverrides },
    };

    const resolveState = (
      descriptor: PermissionDescriptor | PermissionName | '*'
    ): Promise<PermissionStatus> | PermissionStatus => {
      const rawKey = (typeof descriptor === 'string'
        ? descriptor
        : descriptor?.name) as PermissionName | '*';

      const overrideKey = rawKey ?? '*';
      const permissionName: PermissionName =
        overrideKey === '*'
          ? 'geolocation'
          : (overrideKey as PermissionName);
      const override =
        state.overrides[overrideKey] ?? state.overrides['*'];

      if (override) {
        return createStatus(permissionName, override);
      }

      if (!originalQuery || overrideKey === '*') {
        return createStatus(permissionName, 'prompt');
      }

      const normalizedDescriptor: PermissionDescriptor =
        typeof descriptor === 'string'
          ? { name: permissionName }
          : descriptor ?? { name: permissionName };

      return originalQuery(normalizedDescriptor).catch(() =>
        createStatus(permissionName, 'denied')
      );
    };

    const query = (
      descriptor: PermissionDescriptor | PermissionName | '*'
    ) => {
      const result = resolveState(descriptor);
      return result instanceof Promise ? result : Promise.resolve(result);
    };

    permissions.query = query;

    if (!navigatorWithPermissions.permissions) {
      Object.defineProperty(navigatorWithPermissions, 'permissions', {
        configurable: true,
        enumerable: false,
        value: permissions,
      });
    }

    const helper: PermissionHelper = {
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

    globalWithHelper.__PERMISSION_HELPER__ = helper;
  }, overrides);

  const exec = async <T>(action: 'set' | 'reset' | 'snapshot', payload?: unknown): Promise<T> => {
    return page.evaluate(({ action, payload }) => {
      const helper = (window as Window & {
        __PERMISSION_HELPER__?: PermissionHelper;
      }).__PERMISSION_HELPER__;
      if (!helper) {
        if (action === 'snapshot') {
          return {};
        }
        return undefined;
      }

      if (action === 'set') {
        helper.set((payload as PermissionOverrides | undefined) ?? {});
        return undefined;
      }

      if (action === 'reset') {
        helper.reset(payload as (PermissionName | '*')[] | undefined);
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

