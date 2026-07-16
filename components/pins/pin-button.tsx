"use client";

import { PushPinIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsPinned, usePinStore } from "@/lib/pins/store";
import { cn } from "@/lib/utils";
import { withViewTransition } from "@/lib/view-transition";

/**
 * Pin/unpin a release. One `surface` prop picks the whole preset, since look
 * and feedback co-vary:
 *
 * - "card" — the grid cover. White glass over the scrimmed image (Deep Water
 *   Rule), hidden until hover/focus on desktop (shown on touch + when pinned),
 *   a sibling of the cover Link (never nested — a button inside an anchor is
 *   invalid HTML). Toggling runs inside a View Transition so the card visibly
 *   slides to the front; that reorder IS the feedback, so no toast.
 * - "page" — the album action row. Ink glass over the bright ambient wash, a
 *   permanent button. Nothing moves here, so a toast is the only confirmation
 *   (and no View Transition — there's nothing to slide).
 */
export function PinButton({
  albumId,
  name,
  surface,
  className,
}: {
  albumId: string;
  name: string;
  surface: "card" | "page";
  className?: string;
}) {
  const t = useTranslations("pins");
  const pinned = useIsPinned(albumId);
  const togglePin = usePinStore((s) => s.togglePin);
  const isCard = surface === "card";

  const toggle = () => {
    if (isCard) {
      withViewTransition(() => togglePin(albumId));
    } else {
      togglePin(albumId);
      toast.success(pinned ? t("unpinned", { name }) : t("pinned", { name }));
    }
  };

  // Only an unpinned card hides its (outline) pin until hover/focus on desktop;
  // pinned cards and the page button are always visible.
  const revealCls =
    isCard && !pinned
      ? "transition-opacity duration-300 lg:opacity-0 lg:group-hover/card:opacity-100 lg:group-focus-within/card:opacity-100 lg:focus-visible:opacity-100"
      : "";

  return (
    <Button
      type="button"
      variant={isCard ? "glass" : "glass-ink"}
      size={isCard ? "icon-sm" : "icon"}
      aria-pressed={pinned}
      aria-label={pinned ? t("unpin", { name }) : t("pin", { name })}
      onClick={toggle}
      className={cn("rounded-full", revealCls, className)}
    >
      <PushPinIcon size={16} weight={pinned ? "fill" : "regular"} aria-hidden />
    </Button>
  );
}
