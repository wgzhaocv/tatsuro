"use client";

import { ArrowLineDown, Images, Trash, Waveform } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/glass-panel";
import { Button } from "@/components/ui/button";
import {
  clearDownloads,
  clearEverything,
  clearImageCache,
  clearPlaybackCache,
  clearSource,
  useCacheUsage,
} from "@/lib/cache/manage";
import { formatFileSize } from "@/lib/format";
import { LIKED_ID } from "@/lib/playlists/types";

/**
 * Offline storage — the device-storage readout and every clear control. All
 * data comes from useCacheUsage() (the three CacheStorage buckets + the origin
 * estimate); the clear* helpers do the eviction and the hook re-measures off
 * the same broadcasts. One glass panel, hairline-divided sections (no glass on
 * glass): usage meter → per-bucket breakdown → saved albums/playlists → clear
 * all → the track-dot legend.
 */
export function OfflineManager() {
  const t = useTranslations("more");
  const { ready, usage, quota, download, auto, cover, sources, refresh } =
    useCacheUsage();
  const [confirming, setConfirming] = useState(false);

  const nSongs = (n: number) => t("nSongs", { n });
  const ratio = quota > 0 ? Math.min(1, usage / quota) : 0;

  async function run(fn: () => Promise<void>) {
    await fn();
    refresh();
    toast.success(t("clearedToast"));
  }

  return (
    <GlassPanel className="rounded-[20px] p-5 shadow-postcard sm:p-6">
      <h2 className="font-display font-semibold text-foreground text-xl">
        {t("storageTitle")}
      </h2>

      {/* Usage meter — the honest "space this app takes on your device" figure. */}
      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display font-semibold text-3xl text-foreground tabular-nums">
            {formatFileSize(usage)}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("usedOnDevice")}
            {quota > 0 && ` · ${t("ofTotal", { size: formatFileSize(quota) })}`}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full w-full origin-left rounded-full bg-[image:var(--gradient-action)] transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${ratio})` }}
          />
        </div>
      </div>

      {/* Per-bucket breakdown. */}
      <div className="mt-5 flex flex-col border-white/40 border-t pt-1 dark:border-white/10">
        <BucketRow
          icon={<ArrowLineDown weight="bold" aria-hidden />}
          label={t("saved")}
          detail={
            download.count > 0
              ? `${nSongs(download.count)} · ${formatFileSize(download.bytes)}`
              : "—"
          }
          onClear={download.count > 0 ? () => run(clearDownloads) : undefined}
          clearLabel={t("clear")}
        />
        <BucketRow
          icon={<Waveform weight="bold" aria-hidden />}
          label={t("playback")}
          detail={
            auto.count > 0
              ? `${nSongs(auto.count)} · ${formatFileSize(auto.bytes)}`
              : "—"
          }
          onClear={auto.count > 0 ? () => run(clearPlaybackCache) : undefined}
          clearLabel={t("clear")}
        />
        <BucketRow
          icon={<Images weight="bold" aria-hidden />}
          label={t("covers")}
          detail={
            cover.count > 0
              ? `${t("nItems", { n: cover.count })} · ${formatFileSize(cover.bytes)}`
              : "—"
          }
          onClear={cover.count > 0 ? () => run(clearImageCache) : undefined}
          clearLabel={t("clear")}
        />
      </div>

      {/* Saved albums & playlists — per-source removal. */}
      {sources.length > 0 && (
        <div className="mt-5 border-white/40 border-t pt-4 dark:border-white/10">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.06em]">
            {t("savedSources")}
          </p>
          <ul className="mt-1 flex flex-col">
            {sources.map((s) => (
              <SourceRow
                key={s.id}
                label={
                  s.id === LIKED_ID
                    ? t("likedSongs")
                    : s.label || t("albumFallback")
                }
                detail={
                  s.count > 0
                    ? `${nSongs(s.count)} · ${formatFileSize(s.bytes)}`
                    : t("pending")
                }
                removeLabel={t("remove")}
                onRemove={async () => {
                  await clearSource(s);
                  refresh();
                  toast.success(t("removedToast"));
                }}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Clear everything — a deliberate two-step (coral confirm, the one warm
          accent for a decisive action). Hidden until there's anything to clear. */}
      {ready && usage > 0 && (
        <div className="mt-5 border-white/40 border-t pt-4 dark:border-white/10">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-foreground text-sm">
                {t("clearAllConfirm")}
              </span>
              <Button
                variant="cta"
                size="sm"
                onClick={async () => {
                  setConfirming(false);
                  await run(clearEverything);
                }}
              >
                {t("confirm")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setConfirming(true)}
            >
              <Trash aria-hidden />
              {t("clearAll")}
            </Button>
          )}
        </div>
      )}

      {/* Legend — the same two dots the track rows show. */}
      <div className="mt-5 flex flex-col gap-2.5 border-white/40 border-t pt-4 dark:border-white/10">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-[0.06em]">
          {t("legendTitle")}
        </p>
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-1 size-[0.6rem] shrink-0 rounded-full border-[1.6px] border-muted-foreground"
          />
          <span className="text-muted-foreground text-sm">
            {t("legendAuto")}
          </span>
        </div>
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-1 size-[0.52rem] shrink-0 rounded-full bg-turquoise-deep dark:bg-turquoise"
          />
          <span className="text-muted-foreground text-sm">
            {t("legendActive")}
          </span>
        </div>
      </div>
    </GlassPanel>
  );
}

function BucketRow({
  icon,
  label,
  detail,
  onClear,
  clearLabel,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  onClear?: () => void;
  clearLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-muted-foreground [&_svg]:size-[1.05rem]">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[0.95rem] text-foreground leading-tight">
            {label}
          </p>
          <p className="text-muted-foreground text-sm tabular-nums">{detail}</p>
        </div>
      </div>
      {onClear && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          {clearLabel}
        </Button>
      )}
    </div>
  );
}

function SourceRow({
  label,
  detail,
  removeLabel,
  onRemove,
}: {
  label: string;
  detail: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[0.95rem] text-foreground leading-tight">
          {label}
        </p>
        <p className="text-muted-foreground text-sm tabular-nums">{detail}</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={removeLabel}
        title={removeLabel}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
      >
        <Trash aria-hidden />
      </Button>
    </li>
  );
}
