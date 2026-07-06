import { Button } from "@/components/ui/button";
import type { AlbumCategory } from "@/lib/api/types";

export type FilterKey = "all" | AlbumCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "studio", label: "Studio" },
  { key: "live", label: "Live" },
  { key: "compilation", label: "Compilations" },
];

/** Album type filter — glass pills over the hero photo. */
export function AlbumFilters({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (value: FilterKey) => void;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0 sm:justify-end">
      <legend className="sr-only">Filter albums by type</legend>
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
            {f.label}
          </Button>
        );
      })}
    </fieldset>
  );
}
