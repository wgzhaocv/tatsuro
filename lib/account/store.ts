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
  /** epoch ms of the last successful /me fetch — profile is otherwise served
   *  from localStorage, so this gates re-fetching to once a day (see sync.ts). */
  userFetchedAt: number | null;
  /** epoch ms this device completed its login pull for the connected account —
   *  null means it hasn't yet, and the next sync pulls before it pushes (the
   *  account's shape wins; see sync.ts). Persisted, or every app open would
   *  re-pull and discard whatever hadn't uploaded yet. Reset by clear(), so
   *  connecting a different account pulls again. */
  pulledAt: number | null;
  /** Live sync state, for the dialog. Not persisted. */
  status: SyncStatus;

  setSession(token: string): void;
  setUser(user: AccountUser): void;
  setStatus(status: SyncStatus): void;
  /** Record that the login pull is done, so later syncs push normally. */
  markPulled(): void;
  /** Disconnect: drop the token + profile. Local playlists are a separate store
   *  and are deliberately left intact. */
  clear(): void;
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      userFetchedAt: null,
      pulledAt: null,
      status: "idle",

      setSession(token) {
        set({ token });
      },
      setUser(user) {
        set({ user, userFetchedAt: Date.now() });
      },
      setStatus(status) {
        set({ status });
      },
      markPulled() {
        set({ pulledAt: Date.now() });
      },
      clear() {
        set({
          token: null,
          user: null,
          userFetchedAt: null,
          pulledAt: null,
          status: "idle",
        });
      },
    }),
    {
      name: ACCOUNT_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // SSR renders empty; the bootstrap mount rehydrates.
      // Only the token + profile persist; status is per-session.
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        userFetchedAt: s.userFetchedAt,
        pulledAt: s.pulledAt,
      }),
      // v1 → v2 added pulledAt. A device already connected under v1 has been
      // two-way syncing for a while, so its library IS the account's — treat the
      // pull as long done. Defaulting it to null instead would make the next app
      // open perform a login pull and discard anything that had not uploaded.
      migrate: (persisted, version) => {
        const s = persisted as Partial<AccountState> | undefined;
        if (version < 2 && s?.token) return { ...s, pulledAt: 1 };
        return s as AccountState;
      },
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
