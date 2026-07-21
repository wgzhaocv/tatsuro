"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  DotsThreeOutline,
  FilmSlate,
  Playlist,
  VinylRecord,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import { usePathname } from "@/i18n/navigation";
import { usePlayerStore } from "@/lib/player/store";
import { cn } from "@/lib/utils";

// Sections mirror the desktop pill nav (HomeNav): an href means a live screen;
// the rest are drawn as placeholders (shown, never a dead click). `key` indexes
// the `nav` messages; `match` decides which tab reads as current for a given
// path — /album/[id] still belongs to Albums, /mv/* to MV. `usePathname` from
// i18n/navigation is already locale-stripped, so the predicates stay simple.
const SECTIONS: {
  key: "albums" | "mv" | "playlists" | "more";
  icon: Icon;
  href?: string;
  match?: (p: string) => boolean;
}[] = [
  {
    key: "albums",
    href: "/",
    icon: VinylRecord,
    match: (p) => p === "/" || p.startsWith("/album"),
  },
  {
    key: "mv",
    href: "/mv",
    icon: FilmSlate,
    match: (p) => p.startsWith("/mv"),
  },
  {
    key: "playlists",
    href: "/playlists",
    icon: Playlist,
    match: (p) => p.startsWith("/playlists"),
  },
  {
    key: "more",
    href: "/more",
    icon: DotsThreeOutline,
    match: (p) => p.startsWith("/more"),
  },
];

/**
 * The phone/tablet section switcher: a Spotify-style bar pinned to the bottom
 * edge (edge-to-edge, hairline top border), replacing the desktop centre pills
 * below `lg`. It floats under the mini player — the mini bar's bottom offset is
 * raised on small screens (see MiniPlayer) so the two stack rather than
 * overlap. Fixed to the visual viewport, so a collapsing mobile address bar
 * (dvh territory) never buries it. Steps aside on the video stage, matching
 * the PlayerDock.
 *
 * Split in two so only the highlight is dynamic. `BottomNav` reads `usePathname`
 * (a dynamic API under Cache Components — it opts the reader out of the static
 * shell) and hands the path to the presentational `BottomNavShell`. The layout
 * renders `<BottomNavShell activePath={null} />` as the Suspense fallback, so
 * the full bar is in the prerendered HTML from the first paint; when the dynamic
 * render resolves (≈ hydration) the correct tab simply lights up. Nothing
 * pops into existence — only the active mark arrives late.
 */
export function BottomNav() {
  const pathname = usePathname();
  return <BottomNavShell activePath={pathname} />;
}

/**
 * The bar itself. With a real `activePath` it renders live locale-aware Links
 * and lights the current tab. With `activePath === null` it renders as the
 * Suspense fallback: identical chrome, but the tabs are plain non-interactive
 * placeholders (no locale-aware Link — that reads uncached data a fallback
 * can't touch) and nothing is lit. `videoStage` is client store state (initial
 * `false`), not a dynamic API, so it stays here.
 */
export function BottomNavShell({ activePath }: { activePath: string | null }) {
  const t = useTranslations("nav");
  const videoStage = usePlayerStore((s) => s.videoStage);
  if (videoStage) return null;

  // Tapping the tab you're already on scrolls the page to the top — the
  // standard mobile tab-bar gesture. PageScroll owns the window offset, so we
  // drive window here too; honour the reduced-motion switch (a JS smooth-scroll
  // isn't caught by the global CSS kill-switch).
  const scrollToTop = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <>
      {/* Flow spacer: reserves the bar height (bar + safe-area) so page content
          scrolls clear of the fixed bar. Mobile only; the mini bar's own
          clearance is held separately by PlayerDock. */}
      <div
        aria-hidden
        className="h-[calc(env(safe-area-inset-bottom)+3.5rem)] shrink-0 lg:hidden"
      />
      <nav
        aria-label="Sections"
        // Same frosted glass as the nav / mini bar (heavier fill for chrome),
        // carried on a hairline top border; solid-ish so it reads over photos.
        // transform-gpu + backface-hidden promote the bar to its own compositing
        // layer, which iOS keeps pinned to the viewport through the URL-bar
        // show/hide instead of freezing/repainting it against a stale layout
        // viewport (the occasional detach-from-bottom).
        className="fixed inset-x-0 bottom-0 z-30 transform-gpu border-white/55 border-t bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden [-webkit-backface-visibility:hidden] [backface-visibility:hidden] dark:border-white/12 dark:bg-dusk-navy/85"
      >
        <ul className="flex h-14 items-stretch">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const inner = (active: boolean) => (
              <>
                <Icon
                  size={22}
                  weight={active ? "fill" : "regular"}
                  aria-hidden
                />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active && "font-medium",
                  )}
                >
                  {t(s.key)}
                </span>
              </>
            );
            // No href → a not-yet-built screen: shown, disabled, never a dead click.
            if (!s.href)
              return (
                <li key={s.key} className="flex-1">
                  <span
                    aria-disabled="true"
                    title={t("comingSoon")}
                    className="flex h-full cursor-not-allowed flex-col items-center justify-center gap-1 text-muted-foreground/55"
                  >
                    <Icon size={22} aria-hidden />
                    <span className="text-[11px] leading-none">{t(s.key)}</span>
                  </span>
                </li>
              );
            // Fallback instance (activePath === null): the locale-aware Link reads
            // uncached data, which a Suspense fallback can't do — so render the
            // tab as a plain, non-interactive placeholder that looks identical
            // (muted, nothing lit). The real BottomNav swaps in the live Link +
            // highlight once its dynamic render resolves.
            if (activePath === null)
              return (
                <li key={s.key} className="flex-1">
                  <span className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
                    {inner(false)}
                  </span>
                </li>
              );
            const active = s.match?.(activePath) ?? false;
            return (
              <li key={s.key} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    // Exactly at this section's root → the tab becomes a
                    // scroll-to-top button (no navigation). A sub-page that only
                    // matches (e.g. /album/[id] under Albums) still navigates
                    // back to the root via the Link's default behaviour.
                    if (activePath === s.href) {
                      e.preventDefault();
                      scrollToTop();
                    }
                  }}
                  // Active = full-strength foreground + filled glyph (AA in both
                  // themes); inactive = muted, warming on hover. No light-water
                  // colour on text — deep-water law.
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 outline-none transition-colors duration-300 ease-lazy focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {inner(active)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
