"use client";

// Pinned albums as a persisted zustand store, mirroring lib/playlists/store's
// conventions: skipHydration + rehydrate-after-mount (SSR renders empty), a
// partialize whitelist, and updatedAt/deletedAt tombstones so the shape is
// sync-ready. Pure local state — the store is the source of truth; no backend
// yet. When an account sync for pins lands, it uploads toPinRow() (see ./types).

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Pin } from "./types";

export const PINS_STORAGE_KEY = "tatsuro-pins";

type PinsState = {
  pins: Pin[];
  /** Pin or unpin a release by id. Pinning a live one tombstones it; pinning an
   *  absent or tombstoned one (re)pins it fresh, so it floats back to the front. */
  togglePin(albumId: string): void;
};

function now(): number {
  return Date.now();
}

export const usePinStore = create<PinsState>()(
  persist(
    (set) => ({
      pins: [],

      togglePin(albumId) {
        set((s) => {
          const t = now();
          const live = s.pins.find(
            (p) => p.albumId === albumId && !p.deletedAt,
          );
          if (live) {
            // Soft-delete (tombstone) so an unpin can propagate on a future sync.
            return {
              pins: s.pins.map((p) =>
                p.albumId === albumId
                  ? { ...p, deletedAt: t, updatedAt: t }
                  : p,
              ),
            };
          }
          // Absent or tombstoned → pin fresh (drop any stale row, then append).
          return {
            pins: [
              ...s.pins.filter((p) => p.albumId !== albumId),
              { albumId, pinnedAt: t, updatedAt: t },
            ],
          };
        });
      },
    }),
    {
      name: PINS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // SSR renders empty; the hydration mount rehydrates.
      partialize: (s) => ({ pins: s.pins }),
    },
  ),
);

// ── Reactive read hooks ──────────────────────────────────────────────────────

/** Live pinned album ids, most-recently-pinned first — a fresh array each call,
 *  shallow-compared so a stable ordering doesn't force a render. */
export function usePinnedIds(): string[] {
  return usePinStore(
    useShallow((s) =>
      s.pins
        .filter((p) => !p.deletedAt)
        .sort((a, b) => b.pinnedAt - a.pinnedAt)
        .map((p) => p.albumId),
    ),
  );
}

/** Whether a release is currently pinned — a boolean, identity-compared. */
export function useIsPinned(albumId: string): boolean {
  return usePinStore((s) =>
    s.pins.some((p) => p.albumId === albumId && !p.deletedAt),
  );
}
