import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { type AlbumDetail, defaultEdition, editionSlug } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * Edition chips as links — every pressing is its own route (/album/:id for
 * the default, /album/:id/:year for reissues), so editions are shareable URLs
 * instead of client state. Newest reads first; the current one is marked
 * aria-current and wears the solid primary (deep-water) fill.
 */
export async function EditionSwitch({
  album,
  currentEditionId,
  locale,
}: {
  album: AlbumDetail;
  currentEditionId: string;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "album" });
  const def = defaultEdition(album);
  const chips = [...album.editions].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0),
  );

  return (
    <nav aria-label={t("editions")} className="mt-6 w-full">
      <p className="mb-2 text-[13px] font-medium text-foreground/85">
        {t("edition")}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((e) => {
          const selected = e.id === currentEditionId;
          return (
            <Link
              key={e.id}
              href={
                e.id === def.id
                  ? `/album/${album.id}`
                  : `/album/${album.id}/${editionSlug(e)}`
              }
              aria-current={selected ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: selected ? "action" : "glass-ink",
                }),
                "h-11 rounded-full px-4",
              )}
            >
              {e.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
