"use client";

import { FloppyDisk } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { TipTrigger } from "@/components/ui/tip-button";
import type { Song } from "@/lib/api/types";
import { useDownloadsStore, useIsOfflineEnabled } from "@/lib/downloads/store";
import { cn } from "@/lib/utils";

/**
 * "Keep this offline" — a declared intent, not an action. On writes an intent
 * the reconciler converges toward (fetching the missing songs); off tombstones
 * it, and the reconciler demotes the bytes back to the evictable auto bucket
 * (nothing is deleted — it just loses its LRU immunity). Albums snapshot their
 * song ids at toggle time (a release edition is fixed); playlists resolve live.
 *
 * Compact by design — an icon + a small switch, no text label — so it sits at
 * the same footprint as the neighbouring share/pin buttons; the meaning rides
 * on the icon + aria label + tooltip. Frosted glass-ink to match those buttons over the
 * bright cover wash. Shown on both album and playlist headers.
 *
 * A floppy ("keep this") rather than a down-arrow on purpose: the album header
 * sits this switch in the same row as the zip download, and two downward arrows
 * there read as two flavours of the same act. Arrows belong to the download,
 * which really does hand you a file; this only keeps bytes in the app. Same
 * glyph marks the saved bucket in the storage manager.
 */
export function OfflineSwitch({
  contextId,
  kind,
  songs,
  label,
  className,
}: {
  contextId: string;
  kind: "playlist" | "album";
  /** Album only: the edition's songs, snapshotted into the intent on enable. */
  songs?: Song[];
  /** Source display name, stored on the intent for the More page's list. */
  label?: string;
  className?: string;
}) {
  const t = useTranslations("cache");
  const enabled = useIsOfflineEnabled(contextId);
  const setIntent = useDownloadsStore((s) => s.setIntent);
  const clearIntent = useDownloadsStore((s) => s.clearIntent);

  const toggle = (checked: boolean) => {
    if (checked) {
      const songIds = kind === "album" ? songs?.map((s) => s.id) : undefined;
      setIntent(contextId, kind, songIds, label);
      toast.success(t("keepOfflineOn"), {
        description: t("keepOfflineOnDesc"),
      });
    } else {
      clearIntent(contextId);
      toast.success(t("keepOfflineOff"), {
        description: t("keepOfflineOffDesc"),
      });
    }
  };

  return (
    // The whole pill is the tooltip trigger, not just the switch: the floppy is
    // half the target and the part that needs explaining. The switch keeps the
    // accessible name, so a screen reader gets it from the control itself — and
    // one string feeds both, so the hover label can't drift from the name.
    <TipTrigger tip={t("keepOffline")}>
      <div
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 text-navy backdrop-blur-xs dark:border-white/20 dark:bg-dusk-navy/50 dark:text-foreground",
          className,
        )}
      >
        <FloppyDisk size={16} weight="bold" aria-hidden />
        <Switch
          size="sm"
          checked={enabled}
          onCheckedChange={toggle}
          aria-label={t("keepOffline")}
        />
      </div>
    </TipTrigger>
  );
}
