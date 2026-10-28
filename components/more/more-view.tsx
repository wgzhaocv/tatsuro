"use client";

import { useTranslations } from "next-intl";
import { BrowseSheet } from "@/components/browse-grid";
import { CommandSearch } from "@/components/home/command-search";
import { HomeNav } from "@/components/home/home-nav";
import { MissingAlbums } from "./missing-albums";
import { OfflineManager } from "./offline-manager";

/**
 * The More screen: the browse chrome over the shared beach hero, then the same
 * frosted sheet the other tabs use, holding two sections — what the library
 * still misses, and offline storage. Not a card grid (this is a read/manage
 * surface, not a gallery), so the content is width-capped for reading.
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

      {/* One column on phones, split by a hairline; on large screens the two
          sections sit side by side (items-start so the shorter one doesn't
          stretch) instead of stranding a narrow strip. Plain sections, not
          glass cards: the sheet is already the glass layer. */}
      <BrowseSheet>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
          <MissingAlbums />
          <div className="border-white/40 border-t pt-6 lg:border-t-0 lg:pt-0 dark:border-white/10">
            <OfflineManager />
          </div>
        </div>
      </BrowseSheet>
    </div>
  );
}
