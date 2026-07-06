"use client";

import {
  Heart,
  MagnifyingGlass,
  MoonStars,
  Play,
  SkipBack,
  SkipForward,
  SunDim,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * /demo — living reference for the Noon Postcard design system.
 * Kept long-term: every element reads from app/globals.css tokens,
 * so this page tracks the system as it evolves. Spec: DESIGN.md.
 */

const BRAND_PAIRS = [
  {
    name: "Ocean",
    deepName: "Ocean Deep",
    shallow: "#1CA7C4",
    deep: "#0C8097",
  },
  {
    name: "Turquoise",
    deepName: "Turquoise Deep",
    shallow: "#2FBFA8",
    deep: "#0A8473",
  },
  { name: "Coral", deepName: "Coral Ink", shallow: "#FF8A5B", deep: "#B04E23" },
];

const NEUTRALS = [
  { name: "Sky", hex: "#BFE9F2" },
  { name: "Sun", hex: "#FFD666" },
  { name: "Dawn Gold", hex: "#FFD07A" },
  { name: "Peach", hex: "#FFB4A2" },
  { name: "Cobalt", hex: "#145495" },
  { name: "Deep Navy", hex: "#0B3A53" },
  { name: "Ink Mist", hex: "#4C7083" },
  { name: "Sea Glass", hex: "#E9F7F2" },
  { name: "Shell", hex: "#FFF6E9" },
  { name: "Dusk Navy", hex: "#12263A" },
  { name: "Dusk Slate", hex: "#3A4A6B" },
  { name: "Dusk Plum", hex: "#C4739A" },
];

const GRADIENTS = [
  {
    name: "Environment",
    css: "var(--gradient-bg)",
    note: "body backdrop — follows the theme",
    tall: true,
  },
  {
    name: "Shallow water",
    css: "var(--gradient-primary)",
    note: "decorative only — never under text or icons",
  },
  {
    name: "Deep water",
    css: "var(--gradient-action)",
    note: "buttons · progress fills · selected states",
    sample: true,
  },
  {
    name: "Sunset",
    css: "var(--gradient-cta)",
    note: "decorative warmth — hover glows, lit hearts",
  },
  {
    name: "Sunrise",
    css: "var(--gradient-sunrise)",
    note: "reserved for the Golden Dawn exploration",
  },
];

const ALBUMS = [
  {
    title: "For You",
    year: "1982 · Studio",
    cover: "linear-gradient(to bottom, #BFE9F2, #E9F7F2 55%, #FFF6E9)",
  },
  {
    title: "Big Wave",
    year: "1984 · Soundtrack",
    cover: "linear-gradient(160deg, #1CA7C4, #2FBFA8)",
  },
  {
    title: "Melodies",
    year: "1983 · Studio",
    cover: "linear-gradient(to bottom, #FFD07A, #FF8A5B)",
  },
];

const SHADOWS = [
  { name: "postcard", cls: "shadow-postcard", value: "resting cards" },
  { name: "lift-navy", cls: "shadow-lift-navy", value: "quiet hover lift" },
  { name: "lift-ocean", cls: "shadow-lift-ocean", value: "cyan control glow" },
  { name: "lift-coral", cls: "shadow-lift-coral", value: "warm CTA glow" },
];

const FILTERS = ["All", "Studio", "Live"];

const pill =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-7 font-display text-[15px] font-semibold transition-all duration-500 ease-lazy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const iconBtn =
  "inline-flex size-11 items-center justify-center rounded-full transition-all duration-500 ease-lazy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16 sm:mt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-[26px] font-medium text-foreground">{title}</h2>
        {note && <p className="text-[13px] text-foreground/70">{note}</p>}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DemoPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const dusk = resolvedTheme === "dark";
  const [filter, setFilter] = useState("All");
  const [liked, setLiked] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-display text-lg font-semibold tracking-[0.06em] text-foreground">
            TATSURO
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,2.75rem)] font-semibold text-foreground">
            Design demo
          </h1>
          <p className="mt-2 max-w-[58ch] text-[15px] leading-relaxed text-foreground/75">
            Living reference for the Noon Postcard system. Everything on this
            page reads from <code>app/globals.css</code>; the written spec is{" "}
            <code>DESIGN.md</code>.
          </p>
        </div>
        <button
          type="button"
          aria-pressed={dusk}
          onClick={() => setTheme(dusk ? "light" : "dark")}
          className={cn(
            pill,
            "border border-border bg-card px-5 text-card-foreground hover:border-ring hover:shadow-lift-navy",
          )}
        >
          {dusk ? (
            <SunDim size={18} aria-hidden />
          ) : (
            <MoonStars size={18} aria-hidden />
          )}
          {dusk ? "Noon" : "Dusk"}
        </button>
      </header>

      {/* Palette */}
      <Section
        title="Palette"
        note="shallow water decorates · deep water carries text (≥4.5:1)"
      >
        <div className="flex flex-wrap gap-5">
          {BRAND_PAIRS.map((p) => (
            <div key={p.name} className="w-36">
              <div className="overflow-hidden rounded-2xl shadow-postcard">
                <div className="h-14" style={{ background: p.shallow }} />
                <div
                  className="flex h-14 items-center justify-between px-3"
                  style={{ background: p.deep }}
                >
                  <span className="text-[13px] font-medium text-white">Aa</span>
                  <span className="text-[11px] text-white/90">text ✓</span>
                </div>
              </div>
              <p className="mt-2 text-[13px] font-medium text-foreground">
                {p.name} · {p.deepName}
              </p>
              <p className="text-[11px] text-foreground/70">
                {p.shallow} → {p.deep}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
          {NEUTRALS.map((c) => (
            <div key={c.name}>
              <div
                className="h-12 rounded-xl border border-foreground/10"
                style={{ background: c.hex }}
              />
              <p className="mt-1.5 text-[12px] font-medium text-foreground">
                {c.name}
              </p>
              <p className="text-[11px] text-foreground/60">{c.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Gradients */}
      <Section title="Gradients">
        <div className="space-y-4">
          {GRADIENTS.map((g) => (
            <div
              key={g.name}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6"
            >
              <div
                className={cn(
                  "flex items-center rounded-2xl border border-foreground/10 px-4 sm:w-1/2",
                  g.tall ? "h-16" : "h-12",
                )}
                style={{ backgroundImage: g.css }}
              >
                {g.sample && (
                  <span className="text-[14px] font-medium text-white">
                    Aa — white text lives here
                  </span>
                )}
              </div>
              <div className="sm:w-1/2">
                <p className="text-[14px] font-medium text-foreground">
                  {g.name}
                </p>
                <p className="text-[13px] text-foreground/70">{g.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Typography */}
      <Section title="Type" note="hierarchy by size and space, never by weight">
        <div className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/10 pb-6">
            <p className="text-[clamp(2.75rem,5vw,3.75rem)] font-semibold leading-[1.08] text-foreground">
              RIDE ON TIME
            </p>
            <span className="text-[12px] text-foreground/60">
              Display · Quicksand 600
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/10 pb-6">
            <p
              lang="ja"
              className="text-[2.5rem] font-medium leading-[1.15] text-foreground"
            >
              マジック・ウェイズ
            </p>
            <span className="text-[12px] text-foreground/60">
              Headline · Zen Maru Gothic 500
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/10 pb-6">
            <p className="font-display text-[1.75rem] font-medium leading-[1.25] text-foreground">
              Magic Ways — Big Wave · 1984
            </p>
            <span className="text-[12px] text-foreground/60">Title · 28</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-foreground/10 pb-6">
            <p className="max-w-[68ch] text-base leading-[1.6] text-foreground">
              All 34 records, from Circus Town (1976) onward. Lyrics follow the
              timeline; the original line sits beside its translation —{" "}
              <span lang="ja">潮騒</span> next to The Whispering Sea.
            </p>
            <span className="text-[12px] text-foreground/60">
              Body · Inter 400 · ≤72ch
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-[13px] font-medium tracking-[0.02em] text-foreground/80">
              Track 07 · 4:12 · RCA / AIR
            </p>
            <span className="text-[12px] text-foreground/60">Label · 13</span>
          </div>
        </div>
      </Section>

      {/* Controls */}
      <Section
        title="Controls"
        note="white text only on deep water — the Deep Water Rule"
      >
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className={cn(
              pill,
              "text-white hover:-translate-y-0.5 hover:shadow-lift-ocean",
            )}
            style={{ backgroundImage: "var(--gradient-action)" }}
          >
            <Play size={16} weight="fill" aria-hidden />
            Play all
          </button>
          <button
            type="button"
            aria-pressed={liked}
            onClick={() => setLiked(!liked)}
            className={cn(
              pill,
              "bg-coral-ink text-white hover:-translate-y-0.5 hover:shadow-lift-coral",
            )}
          >
            <Heart size={16} weight={liked ? "fill" : "bold"} aria-hidden />
            {liked ? "Liked" : "Like"}
          </button>
          <button
            type="button"
            className={cn(
              pill,
              "border border-border bg-card text-card-foreground hover:border-ring hover:shadow-lift-navy",
            )}
          >
            Shuffle
          </button>
          <button
            type="button"
            disabled
            className={cn(pill, "text-white opacity-45")}
            style={{ backgroundImage: "var(--gradient-action)" }}
          >
            Download
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Filter records</legend>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[13px] font-medium tracking-[0.02em] transition-all duration-500 ease-lazy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  filter === f
                    ? "text-white"
                    : "bg-secondary text-secondary-foreground hover:opacity-80",
                )}
                style={
                  filter === f
                    ? { backgroundImage: "var(--gradient-action)" }
                    : undefined
                }
              >
                {f}
              </button>
            ))}
          </fieldset>
          <div className="relative">
            <label htmlFor="demo-search" className="sr-only">
              Search records
            </label>
            <MagnifyingGlass
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="demo-search"
              type="search"
              placeholder="Search…"
              className="h-11 w-56 bg-card pl-10 pr-5 text-[15px]"
            />
          </div>
        </div>
        <p className="mb-3 mt-8 text-[13px] text-foreground/70">
          shadcn/ui (base-maia) defaults, fed by the same tokens — default
          variant is already deep water:
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="icon" aria-label="Play">
            <Play weight="fill" aria-hidden />
          </Button>
        </div>
      </Section>

      {/* Album cards */}
      <Section title="Album cards" note="postcards — hover picks one up">
        <div className="grid max-w-2xl grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6">
          {ALBUMS.map((a) => (
            <button
              key={a.title}
              type="button"
              className="group rounded-[20px] bg-card p-4 text-left shadow-postcard transition-all duration-500 ease-lazy hover:-translate-y-1 hover:shadow-lift-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div
                className="aspect-square rounded-xl"
                style={{ backgroundImage: a.cover }}
              />
              <p className="mt-3 font-display text-[15px] font-medium text-card-foreground">
                {a.title}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {a.year}
              </p>
            </button>
          ))}
        </div>
      </Section>

      {/* Photo surface */}
      <Section
        title="Photo surface"
        note="light scrim ≤28% → frosted glass → solid controls"
      >
        <div className="relative h-[360px] overflow-hidden rounded-[28px] sm:h-[420px]">
          <Image
            src="https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1800&q=80"
            alt="Clear turquoise shallows, white sand and leaning palm trees"
            fill
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover object-[50%_72%]"
          />
          {/* slow glints on the water */}
          <div className="absolute bottom-[18%] right-[30%] size-2 animate-glint rounded-full bg-white/80 blur-[1px]" />
          <div className="absolute bottom-[10%] right-[14%] size-1.5 animate-glint rounded-full bg-white/70 blur-[1px] [animation-delay:6s]" />
          {/* light navy scrim, never a black mask */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy/25 to-transparent" />
          {/* frosted glass panel */}
          <div className="absolute bottom-5 left-5 max-w-[320px] rounded-2xl bg-white/85 p-5 shadow-postcard backdrop-blur-md sm:bottom-8 sm:left-8 sm:p-6">
            <p className="font-display text-lg font-semibold tracking-[0.04em] text-navy">
              TATSURO YAMASHITA
            </p>
            <p className="mt-1 text-[13px] text-ink-mist">
              34 records · 1976 – 2024
            </p>
            <button
              type="button"
              className={cn(
                pill,
                "mt-4 min-h-10 px-6 text-[14px] text-white hover:-translate-y-0.5 hover:shadow-lift-ocean",
              )}
              style={{ backgroundImage: "var(--gradient-action)" }}
            >
              Dive in
            </button>
          </div>
        </div>
      </Section>

      {/* Player */}
      <Section title="Player" note="ambient shimmer runs on an 8s cycle">
        <div className="max-w-xl rounded-3xl bg-card p-6 shadow-postcard">
          <div className="flex items-center gap-4">
            <div
              className="size-14 shrink-0 rounded-xl"
              style={{ backgroundImage: "var(--gradient-sunrise)" }}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-medium text-card-foreground">
                Sparkle
              </p>
              <p className="truncate text-[13px] text-muted-foreground">
                <span lang="ja">スパークル</span> · For You · 1982
              </p>
            </div>
            <button
              type="button"
              aria-label={
                liked ? "Remove from liked songs" : "Add to liked songs"
              }
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
              className={cn(
                iconBtn,
                "ml-auto text-coral-ink hover:bg-secondary/60",
              )}
            >
              <Heart size={20} weight={liked ? "fill" : "bold"} aria-hidden />
            </button>
          </div>
          <div className="mt-6">
            <div className="h-1.5 rounded-full bg-secondary">
              <div
                className="relative h-full w-[38%] overflow-hidden rounded-full"
                style={{ backgroundImage: "var(--gradient-action)" }}
              >
                <div className="absolute inset-y-0 left-0 w-10 animate-shimmer bg-white/50 blur-[2px]" />
                <div className="absolute right-0 top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(28,167,196,0.7)]" />
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[13px] tracking-[0.02em] text-muted-foreground">
              <span>1:52</span>
              <span>4:59</span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Previous track"
              className={cn(
                iconBtn,
                "text-card-foreground hover:bg-secondary/60",
              )}
            >
              <SkipBack size={20} weight="fill" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Play"
              className="inline-flex size-14 items-center justify-center rounded-full text-white transition-all duration-500 ease-lazy hover:-translate-y-0.5 hover:shadow-lift-ocean focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              style={{ backgroundImage: "var(--gradient-action)" }}
            >
              <Play size={22} weight="fill" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next track"
              className={cn(
                iconBtn,
                "text-card-foreground hover:bg-secondary/60",
              )}
            >
              <SkipForward size={20} weight="fill" aria-hidden />
            </button>
          </div>
        </div>

        <p className="mt-8 mb-3 text-[13px] text-foreground/70">
          Mini bar — always opaque, never glass on glass:
        </p>
        <div className="relative max-w-xl overflow-hidden rounded-2xl bg-card shadow-postcard">
          <div className="absolute inset-x-0 top-0 h-0.5">
            <div
              className="h-full w-[38%]"
              style={{ backgroundImage: "var(--gradient-action)" }}
            />
          </div>
          <div className="flex items-center gap-3 p-3">
            <div
              className="size-11 shrink-0 rounded-lg"
              style={{ backgroundImage: "var(--gradient-sunrise)" }}
            />
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-medium text-card-foreground">
                Sparkle
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                Tatsuro Yamashita
              </p>
            </div>
            <button
              type="button"
              aria-label="Play"
              className={cn(
                iconBtn,
                "ml-auto text-card-foreground hover:bg-secondary/60",
              )}
            >
              <Play size={20} weight="fill" aria-hidden />
            </button>
          </div>
        </div>
      </Section>

      {/* Elevation */}
      <Section
        title="Elevation"
        note="colored, downward, tight — never black blur"
      >
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-6">
          {SHADOWS.map((s) => (
            <div key={s.name} className={cn("rounded-2xl bg-card p-5", s.cls)}>
              <p className="text-[14px] font-medium text-card-foreground">
                {s.name}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <footer className="mt-20 border-t border-foreground/10 pt-6 text-[13px] text-foreground/60">
        Kept long-term. Tokens: <code>app/globals.css</code> · Spec:{" "}
        <code>DESIGN.md</code> · Photo: Unsplash.
      </footer>
    </div>
  );
}
