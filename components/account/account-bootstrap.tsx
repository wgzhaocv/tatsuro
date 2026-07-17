"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useAccountStore } from "@/lib/account/store";
import {
  fetchMe,
  setSyncLang,
  startAutoSync,
  syncNow,
} from "@/lib/account/sync";
import { nameLang } from "@/lib/api/types";
import { useDownloadsStore } from "@/lib/downloads/store";
import { usePinStore } from "@/lib/pins/store";
import { usePlaylistStore } from "@/lib/playlists/store";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Client bootstrap for cloud sync — renders nothing; mounted in the (main)
 * layout beside PlaylistsHydration. On mount it rehydrates the account store,
 * captures the session token the OAuth callback handed back in the URL fragment
 * (#token=…), and — once the local library has loaded — kicks off the first
 * sync. Also wires the debounced auto-push for later edits. Mirrors
 * PlaylistsHydration's rehydrate-after-mount shape.
 */
export function AccountBootstrap() {
  const locale = useLocale();

  // Keep sync's stub-hydration language aligned with the UI locale.
  useEffect(() => {
    setSyncLang(nameLang(locale));
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = startAutoSync();

    (async () => {
      await useAccountStore.persist.rehydrate();
      if (cancelled) return;

      const captured = captureTokenFromHash();
      if (captured) useAccountStore.getState().setSession(captured);
      if (!useAccountStore.getState().token) return;

      // Wait for the local library (playlists + pins) before the first push, or
      // an empty snapshot would upload and then adopt back over real data.
      await Promise.all([
        whenHydrated(usePlaylistStore),
        whenHydrated(usePinStore),
        whenHydrated(useDownloadsStore),
      ]);
      if (cancelled) return;
      // Profile is persisted; only refresh it from /me once a day (it barely
      // changes), so a routine app open doesn't hit the network for it.
      const { user, userFetchedAt } = useAccountStore.getState();
      const stale =
        userFetchedAt == null || Date.now() - userFetchedAt > DAY_MS;
      if (!user || stale) void fetchMe();
      void syncNow();
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return null;
}

/** Read + strip the `#token=…` the OAuth callback appended, without navigating. */
function captureTokenFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.includes("token=")) return null;

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get("token");
  if (!token) return null;

  params.delete("token");
  const rest = params.toString();
  const url =
    window.location.pathname +
    window.location.search +
    (rest ? `#${rest}` : "");
  window.history.replaceState(null, "", url);
  return token;
}

/** Resolve once a skipHydration store has finished its client rehydrate — used
 *  to hold the first cloud push until the local library (playlists + pins) has
 *  loaded, so an empty snapshot can't overwrite the server. */
function whenHydrated<T extends { hasHydrated: boolean }>(store: {
  getState: () => T;
  subscribe: (cb: (s: T) => void) => () => void;
}): Promise<void> {
  if (store.getState().hasHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = store.subscribe((s) => {
      if (s.hasHydrated) {
        unsub();
        resolve();
      }
    });
  });
}
