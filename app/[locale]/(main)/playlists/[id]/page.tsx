import { PlaylistDetail } from "@/components/playlists/playlist-detail";

// The playlist lives in the browser (lib/playlists/store), so the server has
// nothing to say about a given id — and this page must not read `params` at all,
// not even for the locale: on a route with a fallback param (no
// generateStaticParams — ids are client-generated), Next hands out a params
// promise that never resolves, per key or not (server/request/params.js →
// makeHangingParams loops the whole object). Awaiting it postpones the page into
// a runtime hole that every tap has to fetch, which is the round-trip this route
// used to pay for nothing. With no params read, the shell — skeleton included —
// is fully prerendered and shared by every id; PlaylistDetail picks the id off
// the URL, and the title comes from the section layout, whose only param is the
// locale.
export default function PlaylistDetailPage() {
  return <PlaylistDetail />;
}
