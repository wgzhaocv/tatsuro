import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// The brand card, in-segment (see the mv route for why a same-segment file is
// required once a page overrides openGraph in generateMetadata).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function PlaylistsOpengraphImage() {
  return brandOgImage();
}
