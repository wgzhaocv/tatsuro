"use client";

import { useTranslations } from "next-intl";
import { BrowseGrid } from "@/components/browse-grid";
import { CommandSearch } from "@/components/home/command-search";
import { HomeNav } from "@/components/home/home-nav";
import type { Mv } from "@/lib/api/types";
import { MvCard } from "./mv-card";

/**
 * MV foreground: the browse chrome (nav + title) floating over the fixed hero
 * photo, and the frosted panel holding the video grid — the same surface
 * signature as the home album grid. The nav opens the global command palette.
 */
export function MvBrowser({ mvs }: { mvs: Mv[] }) {
  const t = useTranslations("browse");
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="mv" search={<CommandSearch />} />

      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-10">
        <h1 className="font-display text-5xl font-semibold leading-none text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
          {t("mvHeading")}
        </h1>
        {/* No size total here — stream (webm) and download (mp4) weights
            differ per video; each card labels its own. */}
        <p className="mt-2.5 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]">
          {t("videoCount", { n: mvs.length })}
        </p>
      </div>

      <BrowseGrid
        columns="[grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]"
        isEmpty={mvs.length === 0}
        emptyBody={t("mvEmpty")}
      >
        {mvs.map((mv) => (
          <li key={mv.id}>
            <MvCard mv={mv} />
          </li>
        ))}
      </BrowseGrid>
    </div>
  );
}
