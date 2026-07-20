"use client";

import { ArrowClockwise, CaretDown } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LyricsState, StatusSong } from "@/lib/api/studio";
import { foldForSearch, isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

// Work-first order: songs that need hand-timing surface above finished ones.
const GROUPS: {
  state: LyricsState;
  label: string;
  hint: string;
  dot: string;
  defaultOpen: boolean;
}[] = [
  {
    state: "untimed",
    label: "Untimed",
    hint: "has text, needs timing",
    dot: "bg-coral-ink dark:bg-coral",
    defaultOpen: true,
  },
  {
    state: "auto",
    label: "Auto-timed",
    hint: "machine guess, verify",
    dot: "bg-ocean-deep dark:bg-sky-bright",
    defaultOpen: true,
  },
  {
    state: "none",
    label: "No lyrics",
    hint: "nothing on file yet",
    dot: "bg-muted-foreground/50",
    defaultOpen: true,
  },
  {
    state: "verified",
    label: "Verified",
    hint: "done",
    dot: "bg-turquoise-deep dark:bg-turquoise",
    defaultOpen: false,
  },
  {
    state: "instrumental",
    label: "Instrumental",
    hint: "no lyrics needed",
    dot: "bg-muted-foreground/40",
    defaultOpen: false,
  },
];

export function WorkQueue({
  songs,
  selectedId,
  onSelect,
  onRefresh,
}: {
  songs: StatusSong[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<LyricsState>>(
    () => new Set(GROUPS.filter((g) => !g.defaultOpen).map((g) => g.state)),
  );

  const filtered = useMemo(() => {
    const q = foldForSearch(query.trim());
    const base = q
      ? songs.filter(
          (s) =>
            foldForSearch(s.name).includes(q) ||
            foldForSearch(s.album ?? "").includes(q),
        )
      : songs;
    const byState = new Map<LyricsState, StatusSong[]>();
    for (const s of base) {
      const list = byState.get(s.state) ?? [];
      list.push(s);
      byState.set(s.state, list);
    }
    for (const list of byState.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return byState;
  }, [songs, query]);

  const toggle = (state: LyricsState) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title or album…"
          aria-label="Filter songs"
          className="h-9 min-w-0 flex-1 rounded-full border border-border/70 bg-card px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ocean focus:ring-2 focus:ring-ocean/30 dark:focus:border-sky-bright"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          aria-label="Reload status"
          className="shrink-0 rounded-full text-muted-foreground"
        >
          <ArrowClockwise className="size-4" aria-hidden />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        {GROUPS.map((g) => {
          const list = filtered.get(g.state) ?? [];
          if (list.length === 0) return null;
          const isOpen = !collapsed.has(g.state);
          return (
            <section key={g.state}>
              <button
                type="button"
                onClick={() => toggle(g.state)}
                aria-expanded={isOpen}
                className="sticky top-0 z-10 flex w-full items-center gap-2 bg-background/95 px-4 py-2 text-left backdrop-blur-xs"
              >
                <CaretDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-300 ease-lazy",
                    !isOpen && "-rotate-90",
                  )}
                  aria-hidden
                />
                <span
                  className={cn("size-2 rounded-full", g.dot)}
                  aria-hidden
                />
                <span className="font-medium text-foreground text-sm">
                  {g.label}
                </span>
                <span className="text-muted-foreground text-xs">{g.hint}</span>
                <span className="ml-auto tabular-nums text-muted-foreground text-xs">
                  {list.length}
                </span>
              </button>

              {isOpen && (
                <ul>
                  {list.map((s) => {
                    const active = s.id === selectedId;
                    return (
                      <li key={s.id}>
                        <Button
                          variant="row"
                          size="row"
                          onClick={() => onSelect(s.id)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "w-full flex-col items-start gap-0.5 rounded-none px-4 pl-11",
                            active &&
                              "bg-ocean-deep/10 hover:bg-ocean-deep/10 dark:bg-turquoise/10 dark:hover:bg-turquoise/10",
                          )}
                        >
                          <span
                            lang={isJapanese(s.name) ? "ja" : undefined}
                            className={cn(
                              "line-clamp-1 text-sm",
                              active
                                ? "font-medium text-ocean-deep dark:text-turquoise"
                                : "text-foreground",
                            )}
                          >
                            {s.name}
                          </span>
                          {s.album && (
                            <span
                              lang={isJapanese(s.album) ? "ja" : undefined}
                              className="line-clamp-1 text-muted-foreground text-xs"
                            >
                              {s.album}
                            </span>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
