import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// The brand card, in the same segment as the page that overrides openGraph in
// generateMetadata — a page setting openGraph replaces an ancestor's openGraph
// wholesale (images included), so a parent-segment file would never attach. Same
// reason album/[id] and mv colocate theirs.
//
// Deliberately NOT a per-playlist card: the shared read is uncached by design, so
// a cover card would put unpurgeable IO on the OG path, and a generic card also
// means a leaked link never unfurls whose playlist it is or what's on it.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function ShareOpengraphImage() {
  return brandOgImage();
}
