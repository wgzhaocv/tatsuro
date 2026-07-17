"use client";

import { useTranslations } from "next-intl";
import { CommandSearch } from "@/components/home/command-search";
import { HomeNav } from "@/components/home/home-nav";
import { MissingAlbums } from "./missing-albums";
import { OfflineManager } from "./offline-manager";

/**
 * The More screen: the browse chrome over the shared beach hero, then a
 * readable single column of glass panels — what the library still misses, and
 * offline storage. Not a grid (this is a read/manage surface, not a gallery),
 * so the column is width-capped for comfortable reading on wide screens.
 */
export function MoreView() {
  const t = useTranslations("more");

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      <HomeNav current="more" search={<CommandSearch />} />

      <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-10">
        <h1 className="font-display font-semibold text-5xl text-white leading-none [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
          {t("heading")}
        </h1>
      </div>

      {/* One readable column on phones; on large screens the two panels sit
          side by side (items-start so the shorter one doesn't stretch) so the
          surface fills the width instead of stranding a narrow strip. */}
      <div className="mx-auto grid w-full max-w-5xl gap-4 px-5 pb-20 sm:px-8 lg:grid-cols-2 lg:items-start">
        <MissingAlbums />
        <OfflineManager />
      </div>
    </div>
  );
}
