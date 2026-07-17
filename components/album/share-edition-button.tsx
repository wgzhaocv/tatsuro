"use client";

import { CircleNotch, ShareNetwork } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useShareLink } from "@/components/share/use-share";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getEditionShareLink } from "@/lib/share";
import { cn } from "@/lib/utils";

/**
 * Copy / native-share a deep link to the shown edition — its release route plus
 * a minted auth token so the recipient opens straight in, no gate. `slug` is
 * null for the default edition (see getEditionShareLink). Glass-ink over the
 * album's bright ambient wash, pairing with the Play button beside it.
 */
export function ShareEditionButton({
  albumId,
  slug,
  title,
  className,
}: {
  albumId: string;
  slug: string | null;
  title: string;
  className?: string;
}) {
  const t = useTranslations("share");
  const { share, pending } = useShareLink();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="glass-ink"
            size="icon"
            aria-label={t("album")}
            className={cn("rounded-full", className)}
            onClick={() =>
              share(() => getEditionShareLink(albumId, slug), title)
            }
            disabled={pending}
          >
            {pending ? (
              <CircleNotch className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <ShareNetwork className="size-[18px]" aria-hidden />
            )}
          </Button>
        }
      />
      <TooltipContent>{t("album")}</TooltipContent>
    </Tooltip>
  );
}
