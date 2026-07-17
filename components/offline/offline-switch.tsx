"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * "Keep this offline" — a declared intent, not an action. Flipping it on means
 * the reconciler should keep every song here cached; off drops them. UI only
 * for now: the downloads store + reconcile loop that make it real are the next
 * step, so today the switch just renders (uncontrolled) and drives nothing.
 * Frosted pill so it stays legible over the album/playlist cover wash, sitting
 * beside the glass action buttons. Shown on both album and playlist headers.
 */
export function OfflineSwitch({ className }: { className?: string }) {
  const t = useTranslations("cache");

  return (
    <div
      className={cn(
        // Match the neighbouring glass-ink action buttons exactly (see the
        // Button `glass-ink` variant): light glass, ink text, over the bright
        // cover wash.
        "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border border-white/70 bg-white/55 px-3 text-navy backdrop-blur-xs dark:border-white/20 dark:bg-dusk-navy/50 dark:text-foreground",
        className,
      )}
    >
      <span className="text-xs font-medium">{t("keepOffline")}</span>
      <Switch size="sm" aria-label={t("keepOffline")} />
    </div>
  );
}
