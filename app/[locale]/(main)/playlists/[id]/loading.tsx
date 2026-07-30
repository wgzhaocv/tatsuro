import { PlaylistDetailSkeleton } from "@/components/playlists/playlist-detail-skeleton";

// Instant loading state for the /playlists/[id] segment, for the navigations
// that can't have prefetched the route: the router.push into a playlist that
// existed a tick ago (create-playlist-button, starter-mixes-dialog,
// shared-playlist-view) and a card tapped before its prefetch landed. A deep
// link doesn't need it — that entry gets the prerendered shell, which already
// carries this skeleton. It's the same one PlaylistDetail renders until the
// store rehydrates, so the load reads as one steady placeholder with no flash.
export default function Loading() {
  return <PlaylistDetailSkeleton />;
}
