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
import { usePlaylistStore } from "@/lib/playlists/store";

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

      // Wait for the local library before the first push, or an empty snapshot
      // would upload and then adopt back over real data.
      await whenPlaylistsHydrated();
      if (cancelled) return;
      void fetchMe();
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

/** Resolve once the playlist store has finished its client rehydrate. */
function whenPlaylistsHydrated(): Promise<void> {
  if (usePlaylistStore.getState().hasHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = usePlaylistStore.subscribe((s) => {
      if (s.hasHydrated) {
        unsub();
        resolve();
      }
    });
  });
}
