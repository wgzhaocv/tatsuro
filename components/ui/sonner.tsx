"use client";

import {
  CheckCircleIcon,
  InfoIcon,
  SpinnerIcon,
  WarningIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { glassSurface } from "@/components/glass-panel";
import { cn } from "@/lib/utils";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <WarningIcon className="size-4" />,
        error: <XCircleIcon className="size-4" />,
        loading: <SpinnerIcon className="size-4 animate-spin" />,
      }}
      // Drive the text colour through sonner's own var; the surface fill/border
      // come from the glass classes below (which `!`-win over sonner's rules).
      style={{ "--normal-text": "var(--foreground)" } as React.CSSProperties}
      toastOptions={{
        classNames: {
          // Reuses glassSurface (blur + border tokens); only the fill is a touch
          // denser than dialogs since a toast has no dimming backdrop behind it,
          // so it must stay legible straight over the hero photo. `!` beats
          // sonner's own background/border rules (Tailwind v4 suffix).
          toast: cn(
            glassSurface,
            "rounded-xl text-foreground shadow-lift-navy bg-white/55! border-white/55! dark:bg-dusk-navy/70! dark:border-white/15!",
          ),
          // Solid ink pill so the label stays legible on the glass.
          actionButton:
            "rounded-full! bg-foreground! font-medium! text-background!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
