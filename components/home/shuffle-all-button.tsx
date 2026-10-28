"use client";

import { ShuffleIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { nameLang, type SearchIndex } from "@/lib/api/types";
import { shuffleAllSongs } from "@/lib/player/shuffle-all";
import { usePlayerStore } from "@/lib/player/store";
import { useSearchIndex } from "@/lib/queries/search-index";

/** Stable queue identity for the library-wide shuffle queue (no page backs it,
 *  so there's no edition/playlist id to borrow). */
const SHUFFLE_ALL_ID = "shuffle-all";

/**
 * "Shuffle all" — plays the whole catalog in random order, skipping karaoke /
 * instrumental backing tracks (search-index `k:1`). The index is fetched on
 * intent (hover/focus arms it, same as the search palette) so a session that
 * never shuffles doesn't pay the ~17KB download; a click before it lands sets a
 * pending flag and starts playback the moment it arrives.
 */
export function ShuffleAllButton() {
  const t = useTranslations("browse");
  const locale = useLocale();

  const [armed, setArmed] = useState(false);
  const { data, isFetching } = useSearchIndex(armed);
  // Click-before-load: remember the intent and start once the index arrives.
  const [pending, setPending] = useState(false);
  // Guard against a stale pending firing twice (data identity is stable once
  // loaded, but the effect also runs on locale change).
  const startedRef = useRef(false);

  const start = useCallback(
    (index: SearchIndex) => {
      const songs = shuffleAllSongs(index, nameLang(locale));
      if (songs.length === 0) return;
      const store = usePlayerStore.getState();
      // Shuffle must be ON so playQueue lays down a random permutation over the
      // whole list rather than playing it in release order from the start index.
      if (!store.shuffle) store.toggleShuffle();
      const startIndex = Math.floor(Math.random() * songs.length);
      store.playQueue(songs, startIndex, t("shuffleAll"), SHUFFLE_ALL_ID);
    },
    [locale, t],
  );

  useEffect(() => {
    if (pending && data && !startedRef.current) {
      startedRef.current = true;
      setPending(false);
      start(data);
    }
  }, [pending, data, start]);

  const onClick = () => {
    setArmed(true);
    if (data) {
      startedRef.current = true;
      start(data);
    } else {
      setPending(true);
    }
  };

  const loading = pending && isFetching;

  return (
    <Button
      type="button"
      variant="action"
      onPointerEnter={() => setArmed(true)}
      onFocus={() => setArmed(true)}
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className="h-11 shrink-0 gap-2 rounded-full pr-5 pl-4 text-sm font-semibold shadow-lift-ocean"
    >
      <ShuffleIcon className="size-4" weight="bold" aria-hidden />
      {t("shuffleAll")}
    </Button>
  );
}
