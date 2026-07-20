"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** An icon/text button with a hover tooltip. The tip doubles as the accessible
 *  name (icon-only buttons have no visible label), unless aria-label is given.
 *  Root layout already provides the TooltipProvider. */
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
