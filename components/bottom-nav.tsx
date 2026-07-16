"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  Compass,
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
  key: "albums" | "discover" | "mv" | "playlists";
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
  { key: "discover", icon: Compass },
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
];

/**
 * The phone/tablet section switcher: a Spotify-style bar pinned to the bottom
 * edge (edge-to-edge, hairline top border), replacing the desktop centre pills
 * below `lg`. It floats under the mini player — the mini bar's bottom offset is
 * raised on small screens (see MiniPlayer) so the two stack rather than
 * overlap. Fixed to the visual viewport, so a collapsing mobile address bar
 * (dvh territory) never buries it. Steps aside on the video stage, matching
 * the PlayerDock.
 */
export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const videoStage = usePlayerStore((s) => s.videoStage);
  if (videoStage) return null;

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
        // bottom rides --dock-inset-bottom (set by ViewportDockSync) so the bar
        // hugs the *visual* viewport's edge through iOS URL-bar show/hide,
        // instead of detaching from a stale layout-viewport bottom:0.
        className="fixed inset-x-0 bottom-[var(--dock-inset-bottom,0px)] z-30 border-white/55 border-t bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-white/12 dark:bg-dusk-navy/85"
      >
        <ul className="flex h-14 items-stretch">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
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
            const active = s.match?.(pathname) ?? false;
            return (
              <li key={s.key} className="flex-1">
                <Link
                  href={s.href}
                  aria-current={active ? "page" : undefined}
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
