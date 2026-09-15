import { useState } from 'react';

/**
 * Pull-to-refresh state for a screen. `refresh` runs every loader in parallel
 * and clears `isRefreshing` only once all of them have settled, so one slow
 * request can't hide the spinner while the others are still in flight.
 *
 * Loaders should report their own failures (into state, or a banner) the same
 * way the screen's initial load does; a rejection here is swallowed so the
 * spinner always stops.
 */
export function useRefresh(...loaders: (() => Promise<unknown> | unknown)[]) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled(loaders.map((load) => Promise.resolve().then(load)));
    } finally {
      setIsRefreshing(false);
    }
  };

  return { isRefreshing, refresh };
}

/**
 * What a section that loads its own data exposes to its screen, so a
 * pull-to-refresh on the screen can wait for that section to finish too.
 */
export type RefreshHandle = { reload: () => Promise<void> };
