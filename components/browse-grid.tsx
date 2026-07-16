import { useTranslations } from "next-intl";
import type React from "react";
import { GlassPanel } from "@/components/glass-panel";
import { cn } from "@/lib/utils";

/**
 * The frosted panel that floats over the hero photo on browse screens (album
 * grid, MV grid): the glass sheet, the responsive grid, and the shared empty
 * state. Callers pass the grid's column template and the cards; the "No results"
 * fallback body varies per screen.
 */
export function BrowseGrid({
  columns,
  isEmpty,
  emptyBody,
  listRef,
  children,
}: {
  /** Grid layout classes for the `<ul>`: column template plus any gap /
   *  responsive overrides (merged over the default `gap-x-5 gap-y-8`). */
  columns: string;
  isEmpty: boolean;
  emptyBody: string;
  /** Optional handle on the grid `<ul>` — the album grid uses it to FLIP-animate
   *  card reorders (see useFlipReorder). */
  listRef?: React.Ref<HTMLUListElement>;
  children: React.ReactNode;
}) {
  const t = useTranslations("browse");
  return (
    <GlassPanel className="mt-1 flex-1 rounded-t-[28px] border-b-0 px-4 pb-28 pt-6 shadow-[0_-24px_60px_-34px_rgba(11,58,83,0.5)] sm:mx-5 sm:px-6">
      {isEmpty ? (
        <div className="flex flex-col items-center gap-1.5 py-20 text-center">
          <p className="font-display text-lg font-medium text-foreground">
            {t("noResults")}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">{emptyBody}</p>
        </div>
      ) : (
        <ul ref={listRef} className={cn("grid gap-x-5 gap-y-8", columns)}>
          {children}
        </ul>
      )}
    </GlassPanel>
  );
}
