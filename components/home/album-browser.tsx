"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Album, AlbumCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { AlbumCard } from "./album-card";

type FilterKey = "all" | AlbumCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "studio", label: "Studio" },
  { key: "live", label: "Live" },
  { key: "compilation", label: "Compilations" },
];

// Sections shown in the top nav. Only Albums exists today; the rest are drawn as
// placeholders (their screens land in a later phase) — no dead clicks.
const SECTIONS = ["Songs", "MV", "Playlists"];

// White frosted glass with a soft glowing white edge — the mock's chrome material.
const GLASS = "border border-white/40 bg-white/15 backdrop-blur-md";
const ON_GLASS = "text-white [text-shadow:0_1px_6px_rgba(11,58,83,0.55)]";

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

  const years = albums
    .map((a) => a.year)
    .filter((y): y is number => typeof y === "number");
  const range = years.length
    ? `${Math.min(...years)}–${Math.max(...years)}`
    : "";

  const search = (
    <>
      <MagnifyingGlass
        aria-hidden
        weight="bold"
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-white [filter:drop-shadow(0_1px_3px_rgba(11,58,83,0.65))]"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className={cn(
          "h-11 w-full rounded-full pl-10 pr-4 text-sm text-white placeholder:text-white/70 transition-colors duration-300 ease-lazy focus-visible:border-white/70 focus-visible:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
          GLASS,
        )}
      />
    </>
  );

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      {/* Nav over photo: wordmark · sections · search + theme */}
      <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            ON_GLASS,
          )}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 15c3-3 5-3 8 0s5 3 8 0" />
            <path d="M2 9c3-3 5-3 8 0" />
          </svg>
          <span className="font-display text-xl font-semibold tracking-[0.08em]">
            TATSURO
          </span>
        </Link>

        {/* Section nav (desktop) */}
        <nav aria-label="Sections" className="hidden lg:block">
          <div className={cn("flex gap-1 rounded-full p-1", GLASS)}>
            <Link
              href="/"
              aria-current="page"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-navy"
            >
              Albums
            </Link>
            {SECTIONS.map((s) => (
              <span
                key={s}
                aria-disabled="true"
                title="Coming soon"
                className={cn(
                  "cursor-not-allowed rounded-full px-5 py-2 text-sm font-medium text-white/85",
                  "[text-shadow:0_1px_5px_rgba(11,58,83,0.5)]",
                )}
              >
                {s}
              </span>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative hidden w-56 items-center sm:flex">
            {search}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Title + type filter over photo (chips to the right, per the mock) */}
      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div>
            <h1 className="font-display text-5xl font-semibold leading-none text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] sm:text-6xl">
              Albums
            </h1>
            <p className="mt-2.5 text-sm text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]">
              {albums.length} albums · {range}
            </p>
          </div>

          <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0 sm:justify-end">
            <legend className="sr-only">Filter albums by type</legend>
            {FILTERS.map((f) => {
              const selected = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "min-h-11 rounded-full px-4 text-sm font-medium transition duration-300 ease-lazy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                    selected
                      ? "bg-white text-navy shadow-[0_4px_18px_-6px_rgba(255,255,255,0.55)]"
                      : cn(GLASS, ON_GLASS, "hover:bg-white/28"),
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </fieldset>
        </div>

        {/* Search (mobile / tablet) */}
        <div className="relative mt-4 flex w-full items-center sm:hidden">
          {search}
        </div>
      </div>

      {/* Frosted glass grid panel — the sea shows through it */}
      <div className="mt-1 flex-1 rounded-t-[28px] border border-b-0 border-white/55 bg-white/45 px-4 pb-28 pt-6 shadow-[0_-24px_60px_-34px_rgba(11,58,83,0.5)] backdrop-blur-xl sm:mx-5 sm:px-6 dark:border-white/15 dark:bg-[rgba(18,38,58,0.62)]">
        {(filter !== "all" || query.trim() !== "") && (
          <p
            className="mb-5 text-[13px] text-muted-foreground"
            aria-live="polite"
          >
            {shown.length} {shown.length === 1 ? "album" : "albums"}
          </p>
        )}

        {shown.length > 0 ? (
          <ul className="grid gap-x-5 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
            {shown.map((album) => (
              <li key={album.id}>
                <AlbumCard album={album} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-20 text-center">
            <p className="font-display text-lg font-medium text-foreground">
              No results
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {query
                ? `Nothing matches “${query}”.`
                : "Nothing here for this filter."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
