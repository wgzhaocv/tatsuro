"use client";

import { useMemo, useState } from "react";
import type { Album } from "@/lib/api/types";
import { AlbumFilters, type FilterKey } from "./album-filters";
import { AlbumGrid } from "./album-grid";
import { HomeNav } from "./home-nav";
import { HomeSearch } from "./home-search";

/**
 * Home foreground: owns the filter + search state and composes the pieces
 * (nav, title, filters, grid) that float over the fixed hero photo.
 */
export function AlbumBrowser({ albums }: { albums: Album[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return albums.filter(
      (a) =>
        (filter === "all" || a.category === filter) &&
        (q === "" || a.name.toLowerCase().includes(q)),
    );
  }, [albums, filter, query]);

  // Subtitle reflects the current view (count + span), so the one count stays
  // consistent whether or not a filter/search is active.
  const years = shown
    .map((a) => a.year)
    .filter((y): y is number => typeof y === "number");
  const range = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "";

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="Albums" query={query} onQueryChange={setQuery} />

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

        <HomeSearch
          value={query}
          onChange={setQuery}
          className="mt-4 w-full sm:hidden"
        />
      </div>

      <AlbumGrid albums={shown} query={query} />
    </div>
  );
}
