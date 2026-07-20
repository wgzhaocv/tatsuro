"use client";

import { useTranslations } from "next-intl";
import { BrowseGrid } from "@/components/browse-grid";
import { CommandSearch } from "@/components/home/command-search";
import { HomeNav } from "@/components/home/home-nav";
import { useHasHydrated, useVisiblePlaylists } from "@/lib/playlists/store";
import { CreatePlaylistButton } from "./create-playlist-button";
import { PlaylistCard } from "./playlist-card";
import { StarterMixesButton } from "./starter-mixes-dialog";

/**
 * Playlists foreground: the browse chrome over the fixed hero photo, and the
 * frosted panel holding the playlist grid — the same surface as the album/MV
 * grids. The library is client state, so the grid fills in after hydration
 * (the store's skipHydration means SSR renders none); until then the panel is
 * blank rather than flashing an empty-state.
 */
export function PlaylistsBrowser() {
  const t = useTranslations("playlists");
  const hydrated = useHasHydrated();
  const playlists = useVisiblePlaylists();

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="playlists" search={<CommandSearch />} />

      <div className="flex items-end justify-between gap-4 px-5 pb-5 pt-6 sm:px-8 sm:pt-10">
        <div>
          <h1 className="font-display text-5xl font-semibold leading-none text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
            {t("heading")}
          </h1>
          {hydrated && (
            <p className="mt-2.5 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]">
              {t("listSubtitle", { n: playlists.length })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StarterMixesButton
            variant="glass"
            className="h-11 rounded-full px-4"
          />
          <CreatePlaylistButton
            variant="glass"
            className="h-11 rounded-full px-4"
          />
        </div>
      </div>

      <BrowseGrid
        // Phones: a single-column compact list (tighter row gap than the
        // default). sm+: the postcard grid that matches the album/MV screens.
        columns="grid-cols-1 max-sm:gap-y-1 sm:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]"
        isEmpty={hydrated && playlists.length === 0}
        emptyBody={t("emptyListBody")}
      >
        {hydrated
          ? playlists.map((p) => (
              <li key={p.id}>
                <PlaylistCard playlist={p} />
              </li>
            ))
          : // Store rehydrates after mount — show skeleton cards (matching the
            // PlaylistCard's phone-row / sm-postcard shapes) so the grid isn't
            // blank over the hero. Pulse stills under global reduced-motion.
            ["a", "b", "c", "d", "e", "f"].map((k) => (
              <li key={k} aria-hidden="true">
                <div className="flex items-center gap-3 p-2 sm:block sm:p-0">
                  <div className="aspect-square w-14 shrink-0 animate-pulse rounded-lg bg-white/20 sm:w-full sm:rounded-[14px] sm:shadow-postcard" />
                  <div className="min-w-0 flex-1 sm:mt-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-white/20" />
                    <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-white/15" />
                  </div>
                </div>
              </li>
            ))}
      </BrowseGrid>
    </div>
  );
}
