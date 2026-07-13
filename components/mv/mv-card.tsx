"use client";

import { DownloadSimpleIcon, PlayIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { Mv } from "@/lib/api/types";
import { mvDownloadUrl } from "@/lib/api/urls";
import { formatDuration, formatFileSize } from "@/lib/format";
// Video names are mostly Japanese; tag them so :lang(ja) picks the JP stack.
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * One video: a 16:9 thumbnail postcard that plays inline on click (streamed
 * straight off the public bucket domain — no Worker), plus a download control.
 * Download stays a plain GET the browser handles, same contract as before.
 */
export function MvCard({ mv }: { mv: Mv }) {
  const [playing, setPlaying] = useState(false);

  return (
    <article>
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-navy shadow-postcard">
        {playing ? (
          // biome-ignore lint/a11y/useMediaCaption: MVs have no caption track.
          <video
            src={mv.streamUrl}
            controls
            autoPlay
            playsInline
            // A load error (e.g. a transient network drop) falls back to the
            // thumbnail so the user can just click to try again.
            onError={() => setPlaying(false)}
            className="h-full w-full object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play ${mv.name}`}
            className="group/play absolute inset-0 focus-visible:outline-none"
          >
            <Image
              src={mv.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 330px"
              className="object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center transition duration-500 ease-lazy group-hover/play:bg-navy/15"
            >
              <span className="grid size-14 place-items-center rounded-full bg-white/85 text-navy shadow-lift-navy backdrop-blur-sm transition duration-500 ease-lazy group-hover/play:scale-105 group-focus-visible/play:scale-105 group-focus-visible/play:ring-2 group-focus-visible/play:ring-white">
                <PlayIcon weight="fill" className="ml-0.5 size-6" />
              </span>
            </span>
            {mv.duration != null && (
              <span className="absolute bottom-2 right-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium tabular-nums text-navy shadow-sm backdrop-blur-sm">
                {formatDuration(mv.duration)}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2
            lang={isJapanese(mv.name) ? "ja" : undefined}
            title={mv.name}
            className="truncate font-display text-[15px] font-semibold text-foreground"
          >
            {mv.name}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {formatFileSize(mv.fileSize)}
          </p>
        </div>
        <a
          href={mvDownloadUrl(mv.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download ${mv.name}`}
          title="Download"
          className={cn(
            buttonVariants({
              variant: "secondary",
              size: "icon",
            }),
            "size-11 rounded-full",
          )}
        >
          <DownloadSimpleIcon weight="bold" className="size-[18px]" />
        </a>
      </div>
    </article>
  );
}
