"use client";

import { useEffect } from "react";
import { migrateLegacyPlaylists } from "@/lib/playlists/migrate";
import { PLAYLISTS_STORAGE_KEY, usePlaylistStore } from "@/lib/playlists/store";

/**
 * Rehydrates the playlists store once, after mount — the store uses
 * skipHydration so SSR renders empty and the first client render matches. On a
 * fresh install (no new key yet) it also imports the old site's playlists once.
 * Renders nothing; mounted in the (main) layout so the whole app group hydrates
 * together. Mirrors AudioEngine's rehydrate effect for the player store.
 */
export function PlaylistsHydration() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hadNewKey =
        typeof window !== "undefined" &&
        window.localStorage.getItem(PLAYLISTS_STORAGE_KEY) != null;

      await usePlaylistStore.persist.rehydrate();
      if (cancelled) return;

      if (!hadNewKey) {
        const legacy = migrateLegacyPlaylists();
        if (legacy) usePlaylistStore.getState().importLegacy(legacy);
      }
      usePlaylistStore.getState().ensureLiked();
      usePlaylistStore.getState().setHasHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
