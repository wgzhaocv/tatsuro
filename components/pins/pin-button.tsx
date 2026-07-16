"use client";

import { PushPinIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsPinned, usePinStore } from "@/lib/pins/store";

/**
 * Pin/unpin a release from the album page action row — ink glass over the bright
 * ambient wash. Pinned albums sort to the front of the home grid (see
 * AlbumBrowser); nothing moves on this page, so a toast confirms the toggle.
 * (There's deliberately no pin control on the grid cards — it cluttered them.)
 */
export function PinButton({
  albumId,
  name,
}: {
  albumId: string;
  name: string;
}) {
  const t = useTranslations("pins");
  const pinned = useIsPinned(albumId);
  const togglePin = usePinStore((s) => s.togglePin);

  const toggle = () => {
    togglePin(albumId);
    toast.success(pinned ? t("unpinned", { name }) : t("pinned", { name }));
  };

  return (
    <Button
      type="button"
      variant="glass-ink"
      size="icon"
      aria-pressed={pinned}
      aria-label={pinned ? t("unpin", { name }) : t("pin", { name })}
      onClick={toggle}
      className="rounded-full"
    >
      <PushPinIcon size={16} weight={pinned ? "fill" : "regular"} aria-hidden />
    </Button>
  );
}
