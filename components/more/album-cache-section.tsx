"use client";

import { CircleNotch } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CachedAlbum,
  cachedAlbums,
} from "@/app/[locale]/(main)/more/actions";
import { Button } from "@/components/ui/button";
import { clearAlbumCache } from "@/lib/cache/manage";
import { useDownloadsStore } from "@/lib/downloads/store";
import { formatFileSize } from "@/lib/format";
import { CacheRow } from "./cache-row";

/**
 * Per-album cache clearing. Auto-cached songs (a playback byproduct) carry no
 * album id in Cache Storage, so this resolves the device's cached song ids into
 * albums via a server action, then lists the ones that aren't already pinned
 * (those live in the "Saved offline" list above) so each can be cleared on its
 * own. Clearing tombstones any offline intent for the album first, so a pinned
 * album won't just re-download.
 */
// Last resolved albums + the cached-set key they belong to, at module scope so
// re-entering the More page shows them instantly instead of flashing empty while
// the server action re-resolves.
let lastAlbums: CachedAlbum[] = [];
let lastKey = "";

export function AlbumCacheSection({
  songBytes,
  onCleared,
}: {
  /** Cached bytes per song id; its keys are the cached song ids. */
  songBytes: Record<string, number>;
  onCleared: () => void;
}) {
  const t = useTranslations("more");
  const intents = useDownloadsStore((s) => s.intents);
  const [clearingId, setClearingId] = useState<string | null>(null);

  // Resolve cached song ids → albums whenever the cached set changes. Keying on
  // the joined string (song ids never contain commas) means the effect only
  // refires when the set actually changes, not on every identical re-measure.
  const key = Object.keys(songBytes).sort().join(",");
  const [albums, setAlbums] = useState<CachedAlbum[]>(() =>
    key === lastKey ? lastAlbums : [],
  );

  // Ids the user pinned — those albums are shown in the Saved-offline list, so
  // they're filtered out here to avoid listing the same album twice.
  const pinned = new Set(
    intents.filter((i) => !i.deletedAt && i.kind === "album").map((i) => i.id),
  );

  useEffect(() => {
    if (key === "") {
      lastAlbums = [];
      lastKey = "";
      setAlbums([]);
      return;
    }
    let live = true;
    cachedAlbums(key.split(",")).then((res) => {
      // Ignore a result from an effect instance that's already been superseded,
      // so a stale async can't overwrite the module cache or state.
      if (!live) return;
      lastAlbums = res;
      lastKey = key;
      setAlbums(res);
    });
    return () => {
      live = false;
    };
  }, [key]);

  const visible = albums.filter(
    (a) => !a.editionIds.some((id) => pinned.has(id)),
  );
  if (visible.length === 0) return null;

  return (
    <div className="mt-5 border-white/40 border-t pt-4 dark:border-white/10">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.06em]">
        {t("cachedAlbumsTitle")}
      </p>
      <ul className="mt-1 flex flex-col">
        {visible.map((a) => {
          const bytes = a.songIds.reduce(
            (sum, id) => sum + (songBytes[id] ?? 0),
            0,
          );
          const detail =
            t("nSongs", { n: a.songIds.length }) +
            (bytes > 0 ? ` · ${formatFileSize(bytes)}` : "") +
            (a.year ? ` · ${a.year}` : "");
          return (
            <li key={a.id}>
              <CacheRow
                title={a.name}
                detail={detail}
                trailing={
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={clearingId !== null}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      if (clearingId) return;
                      setClearingId(a.id);
                      try {
                        await clearAlbumCache(a.songIds, a.editionIds);
                        onCleared();
                        toast.success(t("clearedToast"));
                      } finally {
                        setClearingId(null);
                      }
                    }}
                  >
                    {clearingId === a.id && (
                      <CircleNotch
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    )}
                    {t("clear")}
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
