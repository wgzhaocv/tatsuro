import type { Metadata } from "next";
import { ARTIST } from "@/lib/constants";

// Site-level constants + helpers for metadata / OpenGraph. The public origin is
// the base for absolute OG image + canonical URLs; it isn't known until deploy
// (ROADMAP stage 4), so it falls back to localhost in dev. Set
// NEXT_PUBLIC_SITE_URL to the real origin (e.g. https://tatsuro.withyakul.me).
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** UI locale → OpenGraph locale tag (og:locale). */
export function ogLocale(locale: string): string {
  if (locale === "ja") return "ja_JP";
  if (locale === "zh") return "zh_CN";
  return "en_US";
}

/** The shared per-page metadata shape. `title` is bare (the root layout's
 *  template appends "— {ARTIST}" for the document title); openGraph/twitter
 *  carry the full title since the template doesn't apply to them. og:image is
 *  supplied by each route's opengraph-image file. */
export function socialMeta(title: string, description: string): Metadata {
  const full = `${title} — ${ARTIST}`;
  return {
    title,
    description,
    openGraph: { title: full, description },
    twitter: { title: full, description },
  };
}
