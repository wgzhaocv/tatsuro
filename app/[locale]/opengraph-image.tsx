import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// Default OG card for the localized app — inherited by home / mv / playlists.
// Releases and the gate ship their own opengraph-image and override this. Placed
// at the [locale] level because a root-level card isn't inherited into this
// subtree (every real route lives under [locale]). Locale-agnostic Latin brand
// type; prerendered per-locale via the [locale] layout's params.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function LocaleOpengraphImage() {
  return brandOgImage();
}
