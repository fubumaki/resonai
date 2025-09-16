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
    const createStatus = (
      name: PermissionName,
      state: PermissionState
    ): PermissionStatus => {
      const target = new EventTarget() as PermissionStatus;

      Object.defineProperty(target, 'state', {
        configurable: true,
        enumerable: true,
        value: state,
        writable: false,
      });

      Object.defineProperty(target, 'onchange', {
        configurable: true,
        enumerable: true,
        value: null,
        writable: true,
      });

      Object.defineProperty(target, 'name', {
        configurable: true,
        enumerable: true,
        value: name,
        writable: false,
      });

      return target;
    };

    const ensureName = (
      status: PermissionStatus,
      name: PermissionName
    ): PermissionStatus => {
      if (status && typeof status === 'object') {
        const statusWithName = status as PermissionStatus & {
          name?: PermissionName;
        };

        if (statusWithName.name !== name) {
          try {
            Object.defineProperty(statusWithName, 'name', {
              configurable: true,
              enumerable: true,
              value: name,
              writable: false,
            });
          } catch {
            // Ignore environments that expose non-configurable PermissionStatus.name.
          }
        }
      }

      return status;
    };

    const descriptorToName = (
      descriptor: PermissionDescriptor | any
    ): PermissionName | '*' => {
      if (descriptor && typeof descriptor === 'object' && 'name' in descriptor) {
        return descriptor.name as PermissionName | '*';
      }

      return descriptor as PermissionName | '*';
    };

    const globalAny = window as any;
    const navAny = navigator as any;
    const permissions: any = navAny.permissions || {};
    const originalQuery = permissions.query?.bind(permissions);

    const state = {
      overrides: { ...initialOverrides },
    };

    const resolveState = async (
      descriptor: PermissionDescriptor | any
    ): Promise<PermissionStatus> => {
      const descriptorKey = descriptorToName(descriptor);
      const permissionName: PermissionName =
        descriptorKey === '*'
          ? ((descriptor && typeof descriptor === 'object' && 'name' in descriptor
              ? (descriptor.name as PermissionName)
              : undefined) ?? 'geolocation')
          : (descriptorKey as PermissionName);
      const override =
        descriptorKey === '*'
          ? state.overrides['*']
          : state.overrides[permissionName] ?? state.overrides['*'];

      if (override) {
        return createStatus(permissionName, override);
      }

      if (!originalQuery || descriptorKey === '*') {
        return createStatus(permissionName, 'prompt');
      }

      try {
        const status = await originalQuery(descriptor);
        return ensureName(status, permissionName);
      } catch {
        return createStatus(permissionName, 'denied');
      }
    };

    const query = (descriptor: PermissionDescriptor | any) =>
      resolveState(descriptor);

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

