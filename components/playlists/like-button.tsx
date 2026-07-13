"use client";

import { Heart } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Song } from "@/lib/api/types";
import { useIsLiked, usePlaylistStore } from "@/lib/playlists/store";
import { cn } from "@/lib/utils";

/**
 * Heart toggle for one song: fills coral when liked (coral-ink at noon, shallow
 * coral at dusk — both ≥4.5:1, Deep Water Rule), muted outline otherwise. Sits
 * in track rows and the player. `aria-pressed` carries the toggle state; the
 * label flips so screen readers announce the action, not just "like".
 */
export function LikeButton({
  song,
  className,
}: {
  song: Song;
  className?: string;
}) {
  const t = useTranslations("playlists");
  const liked = useIsLiked(song.id);
  const toggleLike = usePlaylistStore((s) => s.toggleLike);
  const label = liked ? t("unlike") : t("like");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={liked}
      aria-label={label}
      title={label}
      onClick={() => toggleLike(song)}
      className={cn("rounded-full", className)}
    >
      <Heart
        weight={liked ? "fill" : "bold"}
        className={cn(
          "size-[18px] transition-colors duration-300 ease-lazy",
          liked
            ? "text-coral-ink dark:text-coral"
            : "text-muted-foreground group-hover/button:text-foreground",
        )}
        aria-hidden
      />
    </Button>
  );
}
