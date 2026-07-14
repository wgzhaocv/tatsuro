import { gateOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// The "password required" card — what a tokenless share link unfurls to (the
// proxy sends unauthenticated visitors, bots included, to the gate). Same for
// every locale; prerendered per-locale via the [locale] layout's params.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function GateOpengraphImage() {
  return gateOgImage();
}
