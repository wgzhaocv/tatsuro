import { Play } from "@phosphor-icons/react/dist/ssr";
import type { Song } from "@/lib/api/types";
import { formatDuration } from "@/lib/format";
import { isJapanese } from "@/lib/text";

/**
 * One track: number · title · time. A soft rounded hover wash instead of table
 * rules keeps the sheet airy; on hover/focus the number gives way to a play
 * glyph — the affordance real playback will plug into (roadmap #4). Until the
 * player exists the row is display-only. min-h keeps the touch target ≥44px.
 */
export function TrackRow({ track, index }: { track: Song; index: number }) {
  const number = track.trackNumber ?? index + 1;

  return (
    <li className="group grid min-h-11 grid-cols-[1.5rem_1fr_auto] items-center gap-4 rounded-xl px-3 py-2 transition-colors duration-300 ease-lazy hover:bg-navy/[0.05] dark:hover:bg-white/[0.06]">
      <span className="relative grid h-5 w-6 place-items-center justify-self-end">
        <span className="text-[13px] text-muted-foreground tabular-nums transition-opacity duration-300 group-hover:opacity-0">
          {number}
        </span>
        <Play
          aria-hidden
          size={15}
          weight="fill"
          className="absolute text-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      </span>
      <span
        lang={isJapanese(track.name) ? "ja" : undefined}
        title={track.name}
        className="truncate text-[15px] text-foreground"
      >
        {track.name}
      </span>
      <span className="font-mono text-[13px] text-muted-foreground tabular-nums">
        {typeof track.duration === "number"
          ? formatDuration(track.duration)
          : "—"}
      </span>
    </li>
  );
}
