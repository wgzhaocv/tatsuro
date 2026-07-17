"use client";

import { useEffect } from "react";
import { useDownloadsStore } from "@/lib/downloads/store";

/**
 * Rehydrates the offline-downloads intent store once, after mount — the store
 * uses skipHydration so SSR renders empty and the first client render matches.
 * The offline switches read intent reactively (useIsOfflineEnabled), so they
 * reflect the persisted state once this lands, and the reconciler waits on
 * hasHydrated before its first pass. Renders nothing; mounted in the (main)
 * layout beside the playlists/pins hydration so the whole app group hydrates
 * together.
 */
export function DownloadsHydration() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await useDownloadsStore.persist.rehydrate();
      if (!cancelled) useDownloadsStore.getState().setHasHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
