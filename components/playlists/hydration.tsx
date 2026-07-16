"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { fetchSong } from "@/lib/api/client";
import { type NameLang, nameLang, type Song } from "@/lib/api/types";
import { migrateLegacyPlaylists } from "@/lib/playlists/migrate";
import { PLAYLISTS_STORAGE_KEY, usePlaylistStore } from "@/lib/playlists/store";

/** How many song fetches run at once during the backfill sweep — polite to the
 *  API while still draining a large migrated Liked list quickly. */
const BACKFILL_POOL = 6;

/**
 * Backfill any *thin* entry (no duration / no cover) with full song details,
 * then write them back via hydrateSongs. Thin entries come from two places:
 * the old-site import (migrate.ts stores id + name only) and remote stubs the
 * sync adopts for songs this device has never seen. A normal, fully-populated
 * store finds nothing thin here and issues zero fetches. Self-healing: a song
 * dropped from the catalog just fails its fetch and keeps its thin entry.
 *
 * Runs after hydration so the list paints immediately, then upgrades in place
 * (real times + the spinning-disc cover) once the fetches land. `lang` picks
 * the song-name language, same as a freshly-added song.
 */
async function backfillThinEntries(
  lang: NameLang,
  cancelled: () => boolean,
): Promise<void> {
  const thin = new Set<string>();
  for (const p of usePlaylistStore.getState().playlists) {
    for (const e of p.entries) {
      if (e.song.duration == null || !e.song.coverFrontId) thin.add(e.song.id);
    }
  }
  if (thin.size === 0) return;

  const ids = [...thin];
  const fetched: Song[] = [];
  let next = 0;
  const worker = async () => {
    while (next < ids.length && !cancelled()) {
      const id = ids[next++];
      try {
        fetched.push(await fetchSong(id, lang));
      } catch {
        // No longer in the catalog — leave the thin entry untouched.
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(BACKFILL_POOL, ids.length) }, worker),
  );
  if (!cancelled() && fetched.length) {
    usePlaylistStore.getState().hydrateSongs(fetched);
  }
}

/**
 * Rehydrates the playlists store once, after mount — the store uses
 * skipHydration so SSR renders empty and the first client render matches. On a
 * fresh install (no new key yet) it also imports the old site's playlists once,
 * then backfills any thin entries (migrated or remote-stubbed) with full song
 * details in the background. Renders nothing; mounted in the (main) layout so
 * the whole app group hydrates together. Mirrors AudioEngine's rehydrate effect
 * for the player store.
 */
export function PlaylistsHydration() {
  const locale = useLocale();

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

      // Background upgrade of thin entries — never blocks the list paint.
      await backfillThinEntries(nameLang(locale), () => cancelled);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return null;
}
