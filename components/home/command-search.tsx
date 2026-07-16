"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { filterIndex, songTitle } from "@/lib/api/search";
import { nameLang } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import { useSearchIndex } from "@/lib/queries/search-index";
import { isJapanese } from "@/lib/text";

/**
 * Spotlight-style search: a round glass icon in the nav that opens a command
 * palette (⌘K from anywhere). Searches album + song names against a catalog
 * index fetched once from the CF edge cache and filtered in memory — album
 * names, Japanese titles, and romaji (name_en) all match. Selecting navigates to
 * the album page; a song adds ?song= so the album screen highlights it (old-site
 * style, via SharedSongHighlight). cmdk's own filtering is off (shouldFilter
 * false) — we filter ourselves and render only matches, so the ~550-row catalog
 * never needs virtualization.
 */
export function CommandSearch() {
  const tn = useTranslations("nav");
  const ts = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useSearchIndex();
  const results = useMemo(() => filterIndex(data, query), [data, query]);
  const lang = nameLang(locale);
  const hasQuery = query.trim().length > 0;
  const noResults =
    hasQuery && results.albums.length === 0 && results.songs.length === 0;

  // ⌘K / Ctrl-K toggles the palette from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button
        type="button"
        variant="glass"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={tn("search")}
        className="size-11 rounded-full"
      >
        <MagnifyingGlassIcon weight="bold" className="size-[18px]" />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-[16vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">{ts("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {ts("description")}
          </DialogDescription>
          <Command className="bg-transparent" shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={ts("placeholder")}
            />
            <CommandList className="max-h-[60vh]">
              {isLoading ? (
                <Message>{ts("loading")}</Message>
              ) : !hasQuery ? (
                <Message>{ts("hint")}</Message>
              ) : noResults ? (
                <Message>{ts("empty")}</Message>
              ) : null}

              {results.albums.length > 0 && (
                <CommandGroup heading={ts("albumsHeading")}>
                  {results.albums.map((a) => (
                    <CommandItem
                      key={a.id}
                      value={`album-${a.id}`}
                      onSelect={() => go(`/album/${a.id}`)}
                    >
                      <Cover id={a.cover} />
                      <span
                        lang={isJapanese(a.name) ? "ja" : undefined}
                        className="min-w-0 flex-1 truncate"
                      >
                        {a.name}
                      </span>
                      {a.year != null && (
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                          {a.year}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.songs.length > 0 && (
                <CommandGroup heading={ts("songsHeading")}>
                  {results.songs.map((s) => {
                    const title = songTitle(s, lang);
                    return (
                      <CommandItem
                        key={s.id}
                        value={`song-${s.id}`}
                        onSelect={() =>
                          go(
                            `/album/${s.rid}${s.slug ? `/${s.slug}` : ""}?song=${s.id}`,
                          )
                        }
                      >
                        <Cover id={s.cover} />
                        <span
                          lang={isJapanese(title) ? "ja" : undefined}
                          className="min-w-0 flex-1 truncate"
                        >
                          {title}
                        </span>
                        <span
                          lang={isJapanese(s.album) ? "ja" : undefined}
                          className="ml-auto max-w-[45%] shrink-0 truncate text-xs text-muted-foreground"
                        >
                          {s.album}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Centered muted line for the idle / loading / empty states — keeps the list
 *  from collapsing to a sliver when there are no rows. */
function Message({ children }: { children: ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/** Small square cover thumbnail; neutral box when the id is missing. */
function Cover({ id }: { id: string }) {
  if (!id) {
    return <div className="size-9 shrink-0 rounded-[6px] bg-secondary" />;
  }
  return (
    <Image
      src={coverUrl(id)}
      alt=""
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-[6px] object-cover"
    />
  );
}
