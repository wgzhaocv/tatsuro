"use client";

import { ArrowLineDown, Images, Trash, Waveform } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/glass-panel";
import { cacheDotClass } from "@/components/track/cache-dot";
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
import { cn } from "@/lib/utils";
import { AlbumCacheSection } from "./album-cache-section";
import { CacheRow } from "./cache-row";

/**
 * Offline storage — the device-storage readout and every clear control. All data
 * comes from useCacheUsage() (the three CacheStorage buckets + the origin
 * estimate); the clear* helpers do the eviction and the hook re-measures off the
 * same broadcasts. One glass panel, hairline-divided sections (no glass on
 * glass): usage meter → per-bucket breakdown → saved sources → cached albums →
 * clear all → the track-dot legend.
 */
export function OfflineManager() {
  const t = useTranslations("more");
  const {
    ready,
    usage,
    quota,
    download,
    auto,
    cover,
    sources,
    songBytes,
    refresh,
  } = useCacheUsage();
  const [confirming, setConfirming] = useState(false);

  const nSongs = (n: number) => t("nSongs", { n });
  const ratio = quota > 0 ? Math.min(1, usage / quota) : 0;
  const free = Math.max(0, quota - usage);

  async function run(fn: () => Promise<void>) {
    await fn();
    refresh();
    toast.success(t("clearedToast"));
  }

  const buckets = [
    {
      key: "saved",
      icon: <ArrowLineDown weight="bold" aria-hidden />,
      stats: download,
      clear: clearDownloads,
      count: (n: number) => nSongs(n),
    },
    {
      key: "playback",
      icon: <Waveform weight="bold" aria-hidden />,
      stats: auto,
      clear: clearPlaybackCache,
      count: (n: number) => nSongs(n),
    },
    {
      key: "covers",
      icon: <Images weight="bold" aria-hidden />,
      stats: cover,
      clear: clearImageCache,
      count: (n: number) => t("nItems", { n }),
    },
  ];

  return (
    <GlassPanel className="rounded-[20px] p-5 shadow-postcard sm:p-6">
      <h2 className="font-display font-semibold text-foreground text-xl">
        {t("storageTitle")}
      </h2>

      {/* Usage meter — used on this device, and how much room is left. */}
      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display font-semibold text-3xl text-foreground tabular-nums">
            {formatFileSize(usage)}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("usedOnDevice")}
            {quota > 0 &&
              ` · ${t("available", { size: formatFileSize(free) })}`}
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
        {buckets.map((b) => (
          <CacheRow
            key={b.key}
            leading={b.icon}
            title={t(b.key)}
            detail={
              b.stats.count > 0
                ? `${b.count(b.stats.count)} · ${formatFileSize(b.stats.bytes)}`
                : "—"
            }
            trailing={
              b.stats.count > 0 ? (
                <ClearButton onClick={() => run(b.clear)}>
                  {t("clear")}
                </ClearButton>
              ) : undefined
            }
          />
        ))}
      </div>

      {/* Saved albums & playlists — per-source removal. */}
      {sources.length > 0 && (
        <Section title={t("savedSources")}>
          <ul className="flex flex-col">
            {sources.map((s) => (
              <li key={s.id}>
                <CacheRow
                  title={
                    s.id === LIKED_ID
                      ? t("likedSongs")
                      : s.label || t("albumFallback")
                  }
                  detail={
                    s.count > 0
                      ? `${nSongs(s.count)} · ${formatFileSize(s.bytes)}`
                      : t("pending")
                  }
                  trailing={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("remove")}
                      title={t("remove")}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        await clearSource(s.id);
                        refresh();
                        toast.success(t("removedToast"));
                      }}
                    >
                      <Trash aria-hidden />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Per-album clear — resolves cached songs (incl. playback-only) to albums. */}
      <AlbumCacheSection songBytes={songBytes} onCleared={refresh} />

      {/* Clear everything — a deliberate two-step (coral confirm, the one warm
          accent for a decisive action). Hidden until there's anything to clear. */}
      {ready && usage > 0 && (
        <Section>
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
            <ClearButton onClick={() => setConfirming(true)}>
              <Trash aria-hidden />
              {t("clearAll")}
            </ClearButton>
          )}
        </Section>
      )}

      {/* Legend — the same two marks the track rows show (cacheDotClass). */}
      <Section title={t("legendTitle")}>
        <div className="flex flex-col gap-2.5">
          <LegendRow state="auto">{t("legendAuto")}</LegendRow>
          <LegendRow state="active">{t("legendActive")}</LegendRow>
        </div>
      </Section>
    </GlassPanel>
  );
}

/** A hairline-topped block; optional uppercase label. */
function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-white/40 border-t pt-4 dark:border-white/10">
      {title && (
        <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-[0.06em]">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

function ClearButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="shrink-0 text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function LegendRow({
  state,
  children,
}: {
  state: "auto" | "active";
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        aria-hidden
        className={cn("mt-1 shrink-0 rounded-full", cacheDotClass(state))}
      />
      <span className="text-muted-foreground text-sm">{children}</span>
    </div>
  );
}
