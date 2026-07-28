import { PlaylistDetailSkeleton } from "@/components/playlists/playlist-detail-skeleton";

// Instant loading state for the /playlists/[id] segment. Next shows this the
// moment a navigation into the detail starts — before the route bundle/RSC
// lands and before the local store rehydrates — so tapping a card gives
// immediate feedback instead of hanging on the list. It's the same skeleton
// page.tsx streams and PlaylistDetail renders during hydration, so the whole
// load reads as one steady placeholder with no flash.
export default function Loading() {
  return <PlaylistDetailSkeleton />;
}
