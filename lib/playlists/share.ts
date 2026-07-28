"use client";

// Playlist sharing, owner side — mint and revoke the public slug for one of the
// connected account's playlists (yamashita-api API.md §9). Only the slug travels;
// the viewer page is a separate public read (lib/api/share.ts).
//
// Sharing is account-only by nature: the shared list is served from the server's
// copy, so a playlist the server has never seen can't be shared.

import { useAccountStore } from "@/lib/account/store";
import { syncNow } from "@/lib/account/sync";
import { getPlaylistShareLink } from "@/lib/share";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * One authed call to a playlist's share endpoint. Null when the call never landed
 * — no session, network failure — otherwise the response, ok or not, so a caller
 * can act on the status (see the 404 retry below). A 401 clears the session (the
 * lib/account/sync.ts convention), which flips the entry point back to the
 * sign-in prompt.
 */
async function shareRequest(
  playlistId: string,
  method: "POST" | "DELETE",
): Promise<Response | null> {
  const token = useAccountStore.getState().token;
  if (!token) return null;
  try {
    const res = await fetch(
      `${API}/me/playlists/${encodeURIComponent(playlistId)}/share`,
      { method, headers: { Authorization: `Bearer ${token}` } },
    );
    if (res.status === 401) {
      useAccountStore.getState().clear();
      return null;
    }
    return res;
  } catch {
    return null;
  }
}

/**
 * The full share link for a playlist: take its slug (the endpoint is idempotent,
 * so re-sharing returns the same one), then have the server wrap it in a gate
 * ticket. Null when it can't be built — all `useShareLink` needs to show its
 * failure toast.
 *
 * The `await syncNow()` first is load-bearing: user edits reach the server on a
 * 3s debounce, so a playlist created or edited seconds ago exists only locally
 * and the POST would 404. Flushing first turns that race into a plain wait. (The
 * token is read after it, inside shareRequest — syncNow can clear the session.)
 *
 * That flush isn't airtight on its own: syncNow returns immediately when another
 * sync is already in flight (it only marks one as queued) and resolves quietly on
 * a failed push, either of which leaves the playlist still unknown to the server.
 * So a 404 — the one status that means exactly that — is retried once behind a
 * second flush, by which point the sync that was in the way has settled.
 */
export async function createPlaylistShareLink(
  playlistId: string,
): Promise<string | null> {
  await syncNow();
  let res = await shareRequest(playlistId, "POST");
  if (res?.status === 404) {
    await syncNow();
    res = await shareRequest(playlistId, "POST");
  }
  if (!res?.ok) return null;
  const { slug } = (await res.json()) as { slug?: string };
  return slug ? getPlaylistShareLink(slug) : null;
}

/**
 * Revoke the playlist's live share: the link dies immediately (the whole read
 * path is no-store) and sharing again mints a new slug. Revoking a playlist that
 * was never shared is a no-op success, so the menu needs no state pre-read.
 */
export async function revokePlaylistShare(
  playlistId: string,
): Promise<boolean> {
  return (await shareRequest(playlistId, "DELETE"))?.ok === true;
}
