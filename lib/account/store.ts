"use client";

// Account identity for cloud playlist sync — a persisted zustand store mirroring
// lib/playlists/store's conventions (skipHydration + rehydrate-after-mount, a
// partialize whitelist, reactive read hooks at the bottom). Holds only the
// session token + a bit of profile for the UI; the actual sync lives in
// ./sync.ts, and the playlist data stays in lib/playlists. Login is OPTIONAL and
// independent of the site's password gate — it only unlocks cross-device sync.

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const ACCOUNT_STORAGE_KEY = "tatsuro-account";

/** Google profile echoed by GET /me — display only. */
export type AccountUser = {
  id: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

export type SyncStatus = "idle" | "syncing" | "error";

type AccountState = {
  /** Bearer session token (HMAC, minted by the Worker). null = not connected. */
  token: string | null;
  user: AccountUser | null;
  /** Live sync state, for the dialog. Not persisted. */
  status: SyncStatus;

  setSession(token: string): void;
  setUser(user: AccountUser): void;
  setStatus(status: SyncStatus): void;
  /** Disconnect: drop the token + profile. Local playlists are a separate store
   *  and are deliberately left intact. */
  clear(): void;
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      status: "idle",

      setSession(token) {
        set({ token });
      },
      setUser(user) {
        set({ user });
      },
      setStatus(status) {
        set({ status });
      },
      clear() {
        set({ token: null, user: null, status: "idle" });
      },
    }),
    {
      name: ACCOUNT_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // SSR renders empty; the bootstrap mount rehydrates.
      // Only the token + profile persist; status is per-session.
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);

// ── Reactive read hooks ──────────────────────────────────────────────────────

export function useIsConnected(): boolean {
  return useAccountStore((s) => s.token !== null);
}

export function useAccountUser(): AccountUser | null {
  return useAccountStore((s) => s.user);
}

export function useSyncStatus(): SyncStatus {
  return useAccountStore((s) => s.status);
}
