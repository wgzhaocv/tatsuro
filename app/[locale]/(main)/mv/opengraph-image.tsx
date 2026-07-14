import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// The brand card, in-segment. Needed because this page sets its own openGraph in
// generateMetadata, which otherwise drops the image inherited from an ancestor
// opengraph-image (a same-segment file is always merged — see the album route).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function MvOpengraphImage() {
  return brandOgImage();
}
