"use client";

import { useTranslations } from "next-intl";
import { GlassPanel } from "@/components/glass-panel";

/**
 * What the library still doesn't hold — the band-era and collaboration records
 * that aren't in yet (discography/collaborations.md; the solo catalogue is
 * complete per discography/README.md). Just the list: title, artist, year, and
 * a type tag — no prose. Static: this is a small, hand-kept set, not catalogue
 * data.
 */
const MISSING: {
  album: string;
  artist: string;
  artistJa?: boolean;
  year: number;
  type: "band" | "collab";
}[] = [
  { album: "SONGS", artist: "Sugar Babe", year: 1975, type: "band" },
  {
    album: "Niagara Triangle Vol.1",
    artist: "大瀧詠一・伊藤銀次・山下達郎",
    artistJa: true,
    year: 1976,
    type: "collab",
  },
];

export function MissingAlbums() {
  const t = useTranslations("more");

  return (
    <GlassPanel className="rounded-[20px] p-5 shadow-postcard sm:p-6">
      <h2 className="font-display font-semibold text-foreground text-xl">
        {t("missingTitle")}
      </h2>

      <ul className="mt-3 flex flex-col">
        {MISSING.map((m) => (
          <li
            key={m.album}
            className="flex flex-col gap-1.5 border-white/40 border-t py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3 dark:border-white/10"
          >
            <div className="min-w-0">
              <p className="text-[0.95rem] text-foreground leading-tight">
                {m.album}
              </p>
              <p
                lang={m.artistJa ? "ja" : undefined}
                className="text-muted-foreground text-sm"
              >
                {m.artist}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-sky/60 px-2.5 py-0.5 font-medium text-navy text-xs dark:bg-white/10 dark:text-foreground">
                {m.type === "band" ? t("typeBand") : t("typeCollab")}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {m.year}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
