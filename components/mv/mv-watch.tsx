"use client";

import { CaretLeftIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { AlbumAmbient } from "@/components/album/album-ambient";
import { PageScroll } from "@/components/page-scroll";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import type { Mv } from "@/lib/api/types";
import { mvDownloadUrl } from "@/lib/api/urls";
import { formatDuration, formatFileSize } from "@/lib/format";
import { usePlayerStore } from "@/lib/player/store";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * The watch screen: the thumbnail itself, blurred huge, IS the room —
 * AlbumAmbient without its dissolve, so the artwork keeps its full colour in
 * both themes (full-screen gradients are banned). Everything on it follows
 * the over-photo rules: white text with the navy text-shadow, glass chrome.
 *
 * Video and album audio never overlap — entering claims the video stage
 * (store.videoStage: silences the music and hides the dock, see PlayerDock),
 * and if the music somehow resumes (media keys), a store subscription pauses
 * the video. Leaving the route hides it into an Activity, which runs the
 * effect cleanup and stops playback — coming back shows it paused where it
 * left off.
 */
export function MvWatch({ mv }: { mv: Mv }) {
  const t = useTranslations("mv");
  const videoRef = useRef<HTMLVideoElement>(null);
  // The frame follows the video's real proportions (old PVs/CMs are 4:3) —
  // a fixed 16:9 box would show the element's own letterbox bars inside the
  // postcard frame. 16:9 is only the guess until metadata arrives.
  const [ratio, setRatio] = useState(16 / 9);

  useEffect(() => {
    // Capture the element once: when the route hides into its Activity,
    // React detaches the ref before the cleanup runs, so videoRef.current
    // would already be null — and the hidden video would keep sounding.
    const video = videoRef.current;
    // The element starts loading from the server HTML, so loadedmetadata can
    // fire before hydration attaches the onLoadedMetadata handler — if the
    // dimensions are already in, read them now.
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      setRatio(video.videoWidth / video.videoHeight);
    }
    usePlayerStore.getState().setVideoStage(true);
    // Music starting anyway (hardware media keys) yields the stage back.
    const unsubscribe = usePlayerStore.subscribe((state, prev) => {
      if (state.isPlaying && !prev.isPlaying) video?.pause();
    });
    return () => {
      unsubscribe();
      // Route hidden or unmounted: stop the video, hand the stage back.
      video?.pause();
      usePlayerStore.getState().setVideoStage(false);
    };
  }, []);

  return (
    // `relative isolate`: the ambient's stacking-context contract — see
    // AlbumAmbient's doc.
    <div className="relative isolate flex min-h-dvh flex-col">
      <PageScroll />
      <AlbumAmbient
        cover={mv.thumbnailUrl}
        dissolve={false}
        className="bg-navy"
      />

      {/* ── Chrome: back + context, the full player's header layout ── */}
      <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 lg:max-w-6xl">
        <Link
          href="/mv"
          aria-label={t("back")}
          className={cn(
            buttonVariants({ variant: "glass", size: "icon-lg" }),
            "size-11 rounded-full",
          )}
        >
          <CaretLeftIcon size={20} weight="bold" aria-hidden />
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-[13px] font-medium text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)]">
          {t("musicVideo")}
        </p>
        <a
          href={mvDownloadUrl(mv.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("downloadNamed", { name: mv.name })}
          title={t("download")}
          className={cn(
            buttonVariants({ variant: "glass", size: "icon-lg" }),
            "size-11 shrink-0 rounded-full",
          )}
        >
          <DownloadSimpleIcon size={20} weight="bold" aria-hidden />
        </a>
      </header>

      {/* ── The video as the artwork, caption beneath — the player's stage.
          Width also bows to viewport height so the full 16:9 frame stays on
          screen without scrolling, even in short landscape windows. ── */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-evenly gap-6 px-5 py-6 sm:gap-8 sm:px-8 lg:max-w-6xl">
        <div
          className="w-full shrink-0 overflow-hidden rounded-[14px] bg-navy shadow-postcard sm:rounded-[20px]"
          style={{ maxWidth: `calc((100dvh - 16rem) * ${ratio})` }}
        >
          {/* biome-ignore lint/a11y/useMediaCaption: MVs have no caption track. */}
          <video
            ref={videoRef}
            src={mv.streamUrl}
            poster={mv.thumbnailUrl}
            controls
            autoPlay
            playsInline
            onPlay={() => usePlayerStore.getState().pause()}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                setRatio(v.videoWidth / v.videoHeight);
              }
            }}
            style={{ aspectRatio: ratio }}
            className="w-full object-contain"
          />
        </div>

        <div className="w-full min-w-0 shrink-0 text-center">
          <h1
            lang={isJapanese(mv.name) ? "ja" : undefined}
            className="font-display text-2xl font-medium leading-[1.2] text-white [text-shadow:0_4px_24px_rgba(11,58,83,0.5)] [text-wrap:balance] sm:text-[1.75rem]"
          >
            {mv.name}
          </h1>
          <p className="mt-1.5 text-[15px] text-white/90 [text-shadow:0_2px_10px_rgba(11,58,83,0.5)] tabular-nums">
            {mv.duration != null && `${formatDuration(mv.duration)} · `}
            {t("sizes", {
              stream: formatFileSize(mv.streamSize),
              file: formatFileSize(mv.fileSize),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
