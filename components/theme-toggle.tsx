"use client";

import { MoonStars, SunDim } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Noon ⇄ Dusk switch. Icon visibility is driven by the `.dark` class (set by
 * next-themes before hydration), so the two glyphs crossfade with no flash and
 * no hydration mismatch. Frosted-glass backing keeps it legible over photos.
 * The tooltip label lives in a portal that only renders on open (post-mount),
 * so it can read the resolved theme without a hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const t = useTranslations("theme");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={t("toggle")}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "group relative grid size-11 place-items-center rounded-full border border-white/60 bg-card/80 text-foreground shadow-lift-navy backdrop-blur-xs transition-shadow duration-400 ease-lazy hover:shadow-lift-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 dark:border-white/15 dark:hover:shadow-lift-coral dark:focus-visible:ring-sky-bright/40",
              className,
            )}
          >
            <MoonStars
              size={20}
              weight="fill"
              aria-hidden
              className="absolute rotate-0 scale-100 opacity-100 transition-all duration-500 ease-lazy dark:-rotate-90 dark:scale-50 dark:opacity-0"
            />
            <SunDim
              size={22}
              weight="fill"
              aria-hidden
              className="absolute rotate-90 scale-50 opacity-0 transition-all duration-500 ease-lazy dark:rotate-0 dark:scale-100 dark:opacity-100"
            />
          </button>
        }
      />
      <TooltipContent sideOffset={8}>
        {isDark ? t("toNoon") : t("toDusk")}
      </TooltipContent>
    </Tooltip>
  );
}
