"use client";

import { ArrowLineDown } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * "Keep this offline" — a declared intent, not an action. On means the
 * reconciler should keep every song here cached; off drops them. UI only for
 * now: the downloads store + reconcile loop that make it real are the next
 * step, so flipping it drives no caching — local state + a toast just confirm
 * the toggle (the copy states intent, it doesn't claim a finished cache).
 *
 * Compact by design — an icon + a small switch, no text label — so it sits at
 * the same footprint as the neighbouring share/pin buttons; the meaning rides
 * on the icon + aria/title. Frosted glass-ink to match those buttons over the
 * bright cover wash. Shown on both album and playlist headers.
 */
export function OfflineSwitch({ className }: { className?: string }) {
  const t = useTranslations("cache");
  const [on, setOn] = useState(false);

  return (
    <div
      title={t("keepOffline")}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 text-navy backdrop-blur-xs dark:border-white/20 dark:bg-dusk-navy/50 dark:text-foreground",
        className,
      )}
    >
      <ArrowLineDown size={16} weight="bold" aria-hidden />
      <Switch
        size="sm"
        checked={on}
        onCheckedChange={(checked) => {
          setOn(checked);
          toast.success(checked ? t("keepOfflineOn") : t("keepOfflineOff"));
        }}
        aria-label={t("keepOffline")}
      />
    </div>
  );
}
