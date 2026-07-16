"use client";

import { PushPinIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsPinned, usePinStore } from "@/lib/pins/store";
import { cn } from "@/lib/utils";
import { withViewTransition } from "@/lib/view-transition";

/**
 * Pin/unpin a release. Two surfaces share it: the grid card (variant "glass"
 * over the cover photo — Deep Water Rule: white glass over a scrimmed image)
 * and the album page action row (variant "glass-ink" over the bright ambient
 * wash). A sonner toast confirms every toggle, since the album page has no
 * visible reorder to signal the change (the grid does — the card floats up).
 *
 * On the card it's a sibling of the cover Link (never nested — a button inside
 * an anchor is invalid HTML), so its own click never navigates.
 */
export function PinButton({
  albumId,
  name,
  variant = "glass",
  size = "icon-sm",
  reveal = false,
  className,
}: {
  albumId: string;
  name: string;
  variant?: "glass" | "glass-ink";
  size?: "icon-sm" | "icon";
  /** Grid card: hidden until hover (desktop) / always shown (touch + when
   *  pinned). The album page passes false — it's a permanent action-row button. */
  reveal?: boolean;
  className?: string;
}) {
  const t = useTranslations("pins");
  const pinned = useIsPinned(albumId);
  const togglePin = usePinStore((s) => s.togglePin);

  const toggle = () => {
    // View Transition so the grid reorder slides (the pinned card floats to the
    // front) instead of teleporting; degrades to an instant update elsewhere.
    withViewTransition(() => togglePin(albumId));
    toast.success(pinned ? t("unpinned", { name }) : t("pinned", { name }));
  };

  // Cards default to a shown pin (filled when pinned). The only special case is
  // an unpinned card on desktop, which hides its (outline) pin until the card is
  // hovered/focused — on touch there's no hover, so it stays visible.
  const revealCls =
    reveal && !pinned
      ? "transition-opacity duration-300 lg:opacity-0 lg:group-hover/card:opacity-100 lg:group-focus-within/card:opacity-100 lg:focus-visible:opacity-100"
      : "";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-pressed={pinned}
      aria-label={pinned ? t("unpin", { name }) : t("pin", { name })}
      onClick={toggle}
      className={cn("rounded-full", revealCls, className)}
    >
      <PushPinIcon size={16} weight={pinned ? "fill" : "regular"} aria-hidden />
    </Button>
  );
}
