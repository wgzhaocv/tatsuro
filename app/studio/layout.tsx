import type { Metadata } from "next";

// Admin-only lyrics studio. Unlisted (type the URL), gated by the site
// password, and its writes need the separate LYRICS_PASSWORD. Not localized —
// a single-operator tool, English chrome (sibling of /demo, outside [locale]).
export const metadata: Metadata = {
  title: "Lyrics Studio — Tatsuro",
  robots: { index: false, follow: false },
};

export default function StudioLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
