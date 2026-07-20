"use client";

// Pinned albums as a persisted zustand store, mirroring lib/playlists/store's
// conventions: skipHydration + rehydrate-after-mount (SSR renders empty), a
// partialize whitelist, and updatedAt/deletedAt tombstones so the shape is
// sync-ready. Pure local state — the store is the source of truth; no backend
// yet. When an account sync for pins lands, it uploads toPinRow() (see ./types).

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Pin, PinRow } from "./types";

export const PINS_STORAGE_KEY = "tatsuro-pins";

type PinsState = {
  pins: Pin[];
  /** False until the client has rehydrated. The first cloud sync waits on it so
   *  an empty snapshot can't overwrite the server (see account-bootstrap). Not
   *  persisted; read via the store's getState in the bootstrap. */
  hasHydrated: boolean;
  /** Pin or unpin a release by id. Pinning a live one tombstones it; pinning an
   *  absent or tombstoned one (re)pins it fresh, so it floats back to the front. */
  togglePin(albumId: string): void;
  setHasHydrated(v: boolean): void;
  /** Replace pins with the server's authoritative post-merge set (LWW already
   *  applied server-side). Rebuilt from the thin wire rows; does NOT bump
   *  updatedAt — it's not a user edit, so it must not trigger a re-sync. */
  adoptRemote(remote: PinRow[]): void;
};

function now(): number {
  return Date.now();
}

export const usePinStore = create<PinsState>()(
  persist(
    (set) => ({
      pins: [],
      hasHydrated: false,

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

      setHasHydrated(v) {
        set({ hasHydrated: v });
      },

      adoptRemote(remote) {
        set((s) => {
          const adopted = remote.map((r) => ({
            albumId: r.albumId,
            pinnedAt: r.pinnedAt,
            updatedAt: r.updatedAt,
            deletedAt: r.deletedAt ?? undefined,
          }));
          // Keep pins the server snapshot lacks — pinned locally mid-sync, not
          // uploaded yet. A blind replace would drop them (same data-loss race
          // as playlists); they upload on the next sync.
          const remoteIds = new Set(remote.map((r) => r.albumId));
          const localOnly = s.pins.filter((p) => !remoteIds.has(p.albumId));
          return { pins: [...adopted, ...localOnly] };
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
