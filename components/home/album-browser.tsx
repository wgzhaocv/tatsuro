"use client";

import { useMemo, useState } from "react";
import type { Album } from "@/lib/api/types";
import { AlbumFilters, type FilterKey } from "./album-filters";
import { AlbumGrid } from "./album-grid";
import { CommandSearch } from "./command-search";
import { HomeNav } from "./home-nav";

/**
 * Home foreground: owns the category filter and composes the pieces (nav,
 * title, filters, grid) that float over the fixed hero photo. Name search now
 * lives in the nav's command palette (jump-to-album), not an inline field.
 */
export function AlbumBrowser({ albums }: { albums: Album[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const shown = useMemo(
    () =>
      filter === "all" ? albums : albums.filter((a) => a.category === filter),
    [albums, filter],
  );

  // Subtitle reflects the current view (count + span), so the one count stays
  // consistent whether or not a filter is active.
  const years = shown
    .map((a) => a.year)
    .filter((y): y is number => typeof y === "number");
  const range = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "";

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="Albums" search={<CommandSearch />} />

      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-none text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
              Albums
            </h1>
            <p
              aria-live="polite"
              className="mt-2.5 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]"
            >
              {shown.length} {shown.length === 1 ? "album" : "albums"}
              {range && ` · ${range}`}
            </p>
          </div>
          <AlbumFilters value={filter} onChange={setFilter} />
        </div>
      </div>

      <AlbumGrid albums={shown} />
    </div>
  );
}
