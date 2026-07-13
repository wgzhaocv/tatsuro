"use client";

import { useTranslations } from "next-intl";
import { BrowseGrid } from "@/components/browse-grid";
import { HomeNav } from "@/components/home/home-nav";
import { useHasHydrated, useVisiblePlaylists } from "@/lib/playlists/store";
import { CreatePlaylistButton } from "./create-playlist-button";
import { PlaylistCard } from "./playlist-card";

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
      <HomeNav current="playlists" />

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
        <CreatePlaylistButton
          variant="glass"
          className="h-11 rounded-full px-4"
        />
      </div>

      <BrowseGrid
        columns="[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]"
        isEmpty={hydrated && playlists.length === 0}
        emptyBody={t("emptyListBody")}
      >
        {hydrated &&
          playlists.map((p) => (
            <li key={p.id}>
              <PlaylistCard playlist={p} />
            </li>
          ))}
      </BrowseGrid>
    </div>
  );
}
