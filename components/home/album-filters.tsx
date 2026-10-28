import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { AlbumCategory } from "@/lib/api/types";

export type FilterKey = "all" | AlbumCategory;

const FILTERS: { key: FilterKey }[] = [
  { key: "all" },
  { key: "studio" },
  { key: "live" },
  { key: "compilation" },
  { key: "single" },
];

/** Album type filter — glass pills over the hero photo. */
export function AlbumFilters({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (value: FilterKey) => void;
}) {
  const t = useTranslations("filters");
  // display:contents — the chips hoist into the parent toolbar's flex-wrap so
  // they share one wrapping row with the Shuffle-all button (which stays a
  // sibling, not a member of this filter group). The fieldset + legend keep
  // grouping the chips for a11y.
  return (
    <fieldset className="contents">
      <legend className="sr-only">{t("legend")}</legend>
      {FILTERS.map((f) => {
        const selected = value === f.key;
        return (
          <Button
            key={f.key}
            type="button"
            variant={selected ? "glass-active" : "glass"}
            aria-pressed={selected}
            onClick={() => onChange(f.key)}
            className="h-11 rounded-full px-4"
          >
            {t(f.key)}
          </Button>
        );
      })}
    </fieldset>
  );
}
