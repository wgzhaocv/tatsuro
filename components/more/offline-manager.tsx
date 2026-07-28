"use client";

import {
  CircleNotch,
  FloppyDisk,
  Images,
  Trash,
  Waveform,
} from "@phosphor-icons/react";
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
    measuring,
    refresh,
  } = useCacheUsage();
  const [confirming, setConfirming] = useState(false);
  // Key of the clear currently running (bucket:*, source:*, or "all"), so its
  // button shows a spinner and every clear is blocked meanwhile — no double-tap,
  // no two clears racing on the same caches.
  const [pending, setPending] = useState<string | null>(null);

  const nSongs = (n: number) => t("nSongs", { n });
  // Headline = the caches we actually manage here (so it equals the breakdown
  // below). The whole-origin estimate().usage is larger — it also counts the app
  // itself, IndexedDB, and the browser's storage padding — which read as a
  // mismatch against the per-bucket rows, so it isn't shown as the total.
  const cacheTotal = download.bytes + auto.bytes + cover.bytes;
  const ratio = quota > 0 ? Math.min(1, cacheTotal / quota) : 0;
  const free = Math.max(0, quota - usage);

  async function runClear(
    key: string,
    fn: () => Promise<void>,
    doneMsg?: string,
  ) {
    if (pending) return; // already clearing something — ignore repeat taps
    setPending(key);
    try {
      await fn();
      refresh();
      toast.success(doneMsg ?? t("clearedToast"));
    } finally {
      setPending(null);
    }
  }

  const buckets = [
    {
      key: "saved",
      icon: <FloppyDisk weight="bold" aria-hidden />,
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

  // Until the first measurement resolves, show a skeleton rather than flashing a
  // misleading "0 MB" / empty rows.
  if (!ready) return <StorageSkeleton title={t("storageTitle")} />;

  return (
    <GlassPanel className="rounded-[20px] p-5 shadow-postcard sm:p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-semibold text-foreground text-xl">
          {t("storageTitle")}
        </h2>
        {measuring && (
          <CircleNotch
            size={16}
            weight="bold"
            aria-label={t("measuring")}
            className="animate-spin text-muted-foreground motion-reduce:animate-none"
          />
        )}
      </div>

      {/* Meter — total of the managed caches (equals the breakdown below), plus
          the real free space left on the device. */}
      <div className="mt-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="font-display font-semibold text-3xl text-foreground tabular-nums">
            {formatFileSize(cacheTotal)}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("cached")}
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
                <ClearButton
                  pending={pending === `bucket:${b.key}`}
                  disabled={pending !== null}
                  onClick={() => runClear(`bucket:${b.key}`, b.clear)}
                >
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
                      disabled={pending !== null}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        runClear(
                          `source:${s.id}`,
                          () => clearSource(s.id),
                          t("removedToast"),
                        )
                      }
                    >
                      {pending === `source:${s.id}` ? (
                        <CircleNotch
                          className="animate-spin motion-reduce:animate-none"
                          aria-hidden
                        />
                      ) : (
                        <Trash aria-hidden />
                      )}
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
                disabled={pending !== null}
                onClick={async () => {
                  await runClear("all", clearEverything);
                  setConfirming(false);
                }}
              >
                {pending === "all" && (
                  <CircleNotch
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                )}
                {t("confirm")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending !== null}
                onClick={() => setConfirming(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          ) : (
            <ClearButton
              icon={<Trash aria-hidden />}
              disabled={pending !== null}
              onClick={() => setConfirming(true)}
            >
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

/** Loading state for the storage panel — same title + shape as the real one, so
 *  nothing shifts when the measurement resolves. Pulse stills under global
 *  reduced-motion. */
function StorageSkeleton({ title }: { title: string }) {
  return (
    <GlassPanel className="rounded-[20px] p-5 shadow-postcard sm:p-6">
      <h2 className="font-display font-semibold text-foreground text-xl">
        {title}
      </h2>
      <div className="mt-3" aria-hidden>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-foreground/10" />
        <div className="mt-4 h-2 animate-pulse rounded-full bg-foreground/10" />
      </div>
      <div className="mt-5 flex flex-col gap-4 border-white/40 border-t pt-5 dark:border-white/10">
        {["a", "b", "c"].map((k) => (
          <div key={k} className="flex items-center gap-3" aria-hidden>
            <div className="size-[1.05rem] shrink-0 animate-pulse rounded bg-foreground/10" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-24 animate-pulse rounded bg-foreground/10" />
              <div className="mt-1.5 h-3 w-16 animate-pulse rounded bg-foreground/10" />
            </div>
          </div>
        ))}
      </div>
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
  pending,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  pending?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || pending}
      className="shrink-0 text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {pending ? (
        <CircleNotch
          className="animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        icon
      )}
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
