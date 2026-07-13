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
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0 sm:justify-end">
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
