"use client";

import { useEffect } from "react";
import { usePinStore } from "@/lib/pins/store";

/**
 * Rehydrates the pins store once, after mount — the store uses skipHydration so
 * SSR renders empty and the first client render matches. The grid reads pins
 * reactively (usePinnedIds), so it re-orders once this lands. Sets hasHydrated
 * so the first cloud sync can wait for the local pins before pushing (see
 * account-bootstrap). Renders nothing; mounted in the (main) layout so the whole
 * app group hydrates together. Simpler than PlaylistsHydration (no legacy
 * import, no thin-entry backfill): a pin is just a release id.
 */
export function PinsHydration() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await usePinStore.persist.rehydrate();
      if (!cancelled) usePinStore.getState().setHasHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
