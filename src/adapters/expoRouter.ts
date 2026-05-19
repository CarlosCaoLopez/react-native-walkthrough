import { router, usePathname } from 'expo-router';
import type { Href } from 'expo-router';
import React, { useEffect } from 'react';
import type { NavigationAdapter } from './types';

type NavigationAction = 'push' | 'replace' | 'navigate';

interface ExpoRouterAdapter extends NavigationAdapter {
  navigate(route: string, action?: NavigationAction): void | Promise<void>;
  /** @internal */
  _setCurrentRoute(route: string): void;
  dispose(): void;
}

function createAdapter(): ExpoRouterAdapter {
  let currentRoute: string | null = null;
  const listeners = new Set<(route: string) => void>();

  return {
    navigate(route, action: NavigationAction = 'navigate') {
      // Cast intentional: route comes from user-defined tour config,
      // type-safe routing is the consumer's responsibility.
      const href = route as Href;
      switch (action) {
        case 'push':
          router.push(href);
          break;
        case 'replace':
          router.replace(href);
          break;
        default:
          router.navigate(href);
      }
    },

    getCurrentRoute() {
      return currentRoute;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose() {
      listeners.clear();
      currentRoute = null;
    },

    _setCurrentRoute(route) {
      if (route === currentRoute) return;
      currentRoute = route;
      listeners.forEach((l) => l(route));
    },
  };
}

function Bridge({ adapter }: { adapter: ExpoRouterAdapter }): null {
  const pathname = usePathname();
  useEffect(() => {
    adapter._setCurrentRoute(pathname);
  }, [pathname, adapter]);
  return null;
}

export function createExpoRouterAdapter() {
  const adapter = createAdapter();
  return {
    adapter,
    Bridge: () => React.createElement(Bridge, { adapter }),
  };
}
