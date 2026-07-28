"use client";

import type { ComponentProps, ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** An icon/text button with a hover tooltip. The tip doubles as the accessible
 *  name (icon-only buttons have no visible label), unless aria-label is given.
 *  Root layout already provides the TooltipProvider.
 *
 *  Reach for this for every icon-only control: one string, so the hover label and
 *  the accessible name cannot drift apart. TipTrigger below is the same deal for
 *  a button that already sits inside another trigger. */
export function TipButton({
  tip,
  children,
  "aria-label": ariaLabel,
  ...props
}: { tip: string } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button aria-label={ariaLabel ?? tip} {...props}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** A tooltip around a trigger that is already something else's trigger — a
 *  MenuTrigger, a DialogTrigger, or a wrapper element. base-ui chains these by
 *  nesting `render`, and the nesting is inherent (see its composition handbook),
 *  so this exists to keep the chain to one level at the call site. The rendered
 *  child owns the accessible name; pass the same string here. */
export function TipTrigger({
  tip,
  children,
}: {
  tip: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}
