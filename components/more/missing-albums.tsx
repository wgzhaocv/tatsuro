"use client";

import { useTranslations } from "next-intl";

/**
 * What the library still doesn't hold — the band-era / collaboration records,
 * the long-tail best-of compilations, and new releases that aren't in yet (the seven main
 * compilations and the whole solo catalogue are complete; see
 * discography/compilations.md, collaborations.md). Just the list: title, artist,
 * year, and a type tag — no prose. Static: a small, hand-kept set.
 */
const TYPE_KEY = {
  band: "typeBand",
  collab: "typeCollab",
  comp: "typeComp",
  live: "typeLive",
} as const;

const MISSING: {
  album: string;
  artist?: string;
  artistJa?: boolean;
  year: number;
  type: keyof typeof TYPE_KEY;
}[] = [
  {
    album: "Niagara Triangle Vol.1",
    artist: "大瀧詠一・伊藤銀次・山下達郎",
    artistJa: true,
    year: 1976,
    type: "collab",
  },
  { album: "Tatsuro Collection", year: 1985, type: "comp" },
  { album: "Ballad for You", year: 1986, type: "comp" },
  { album: "Rock'n Funk Tatsu", year: 1986, type: "comp" },
  { album: "Best Pack I", year: 1990, type: "comp" },
  { album: "Best Pack II", year: 1990, type: "comp" },
  { album: "Tatsuro Songs From L.A.", year: 1990, type: "comp" },
  { album: "Tatsuro Songs From L.A. 2", year: 1991, type: "comp" },
  // Out 2026-10-14 (3CD standard / 4CD first press) — add as a Release once ripped.
  { album: "JOY 2", year: 2026, type: "live" },
];

export function MissingAlbums() {
  const t = useTranslations("more");

  return (
    <section>
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
              {m.artist && (
                <p
                  lang={m.artistJa ? "ja" : undefined}
                  className="text-muted-foreground text-sm"
                >
                  {m.artist}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-sky/60 px-2.5 py-0.5 font-medium text-navy text-xs dark:bg-white/10 dark:text-foreground">
                {t(TYPE_KEY[m.type])}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">
                {m.year}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
