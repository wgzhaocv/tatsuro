"use client";

import { useMemo, useState } from "react";
import { BrowseGrid } from "@/components/browse-grid";
import { CommandSearch } from "@/components/home/command-search";
import { HomeNav } from "@/components/home/home-nav";
import { HomeSearch } from "@/components/home/home-search";
import type { Mv } from "@/lib/api/types";
import { formatFileSize } from "@/lib/format";
import { MvCard } from "./mv-card";

/**
 * MV foreground: the browse chrome (nav + title + search) floating over the
 * fixed hero photo, and the frosted panel holding the video grid — the same
 * surface signature as the home album grid. The nav opens the global command
 * palette; the inline field filters this page's videos by name.
 */
export function MvBrowser({ mvs }: { mvs: Mv[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === "" ? mvs : mvs.filter((m) => m.name.toLowerCase().includes(q));
  }, [mvs, query]);

  // Total size up front: these are downloads, so the weight is real info.
  const totalBytes = shown.reduce((sum, m) => sum + m.fileSize, 0);

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="MV" search={<CommandSearch />} />

      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-none text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
              Music Videos
            </h1>
            <p
              aria-live="polite"
              className="mt-2.5 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]"
            >
              {shown.length} {shown.length === 1 ? "video" : "videos"}
              {totalBytes > 0 && ` · ${formatFileSize(totalBytes)}`}
            </p>
          </div>
          <HomeSearch
            value={query}
            onChange={setQuery}
            className="w-full sm:w-64"
          />
        </div>
      </div>

      <BrowseGrid
        columns="[grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]"
        isEmpty={shown.length === 0}
        emptyBody={
          query ? `Nothing matches “${query}”.` : "No music videos yet."
        }
      >
        {shown.map((mv) => (
          <li key={mv.id}>
            <MvCard mv={mv} />
          </li>
        ))}
      </BrowseGrid>
    </div>
  );
}
