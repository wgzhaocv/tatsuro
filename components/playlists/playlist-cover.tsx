import { Heart, MusicNotes } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { coverUrl } from "@/lib/api/urls";
import type { Playlist } from "@/lib/playlists/types";
import { cn } from "@/lib/utils";

/** First usable cover: an explicit album cover, else the first entry that has
 *  one (imported/thin entries may carry none). */
function derivedCoverId(playlist: Playlist): string | undefined {
  return (
    playlist.coverId ??
    playlist.entries.find((e) => e.song.coverFrontId)?.song.coverFrontId
  );
}

/**
 * A playlist's square artwork. Liked gets the deep-water action gradient with a
 * white heart (≥4.5:1, Deep Water Rule) — the sea palette, never the old
 * purple/pink. User playlists show their derived cover, or a muted placeholder
 * when no song has one yet. The caller sets the box size + rounding via
 * className; this fills it.
 */
export function PlaylistCover({
  playlist,
  className,
  sizes,
}: {
  playlist: Playlist;
  className?: string;
  sizes?: string;
}) {
  if (playlist.kind === "liked") {
    return (
      <div
        className={cn(
          "relative grid place-items-center overflow-hidden bg-[image:var(--gradient-action)]",
          className,
        )}
      >
        <Heart weight="fill" className="size-1/3 text-white" aria-hidden />
      </div>
    );
  }

  const coverId = derivedCoverId(playlist);
  if (coverId) {
    return (
      <div className={cn("relative overflow-hidden bg-secondary", className)}>
        <Image
          src={coverUrl(coverId)}
          alt=""
          fill
          sizes={sizes}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-secondary",
        className,
      )}
    >
      <MusicNotes className="size-1/3 text-muted-foreground" aria-hidden />
    </div>
  );
}
