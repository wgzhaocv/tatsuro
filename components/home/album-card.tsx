import { PushPinIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/components/ui/link";
import type { Album } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import { useIsPinned } from "@/lib/pins/store";
// Content data is often Japanese; tag it so :lang(ja) picks up the JP gothic stack.
import { isJapanese } from "@/lib/text";

/** A postcard: square cover + name + year, links to the album. (Pinning is done
 *  from the album page, not here — a cover-corner pin button cluttered the grid.
 *  Pinned albums still sort to the front; see AlbumBrowser.) A pinned album shows
 *  a small pin next to its title — a status marker only, off the cover. */
export function AlbumCard({
  album,
  priority,
}: {
  album: Album;
  /** Set on the first row so the cover — the grid's LCP element — loads eager
   *  with fetchpriority=high instead of next/image's default lazy. */
  priority?: boolean;
}) {
  const tc = useTranslations("category");
  const ta = useTranslations("album");
  const tp = useTranslations("pins");
  const isJa = isJapanese(album.name);
  const pinned = useIsPinned(album.id);
  const badge =
    album.discCount > 1
      ? ta("cd", { n: album.discCount })
      : album.editionCount > 1
        ? ta("versions", { n: album.editionCount })
        : null;

  return (
    <Link
      href={`/album/${album.id}`}
      aria-label={album.year ? `${album.name}, ${album.year}` : album.name}
      className="group block rounded-2xl focus:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-secondary shadow-postcard transition duration-500 ease-lazy group-hover:-translate-y-1.5 group-hover:shadow-lift-navy group-focus-visible:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background">
        <Image
          src={coverUrl(album.coverFrontId)}
          alt=""
          fill
          // Next 16 deprecated `priority`; drive the LCP hint directly. First
          // row loads eager + high so the grid's LCP cover isn't lazy.
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 640px) 45vw, 230px"
          className="object-cover"
        />
        {badge && (
          <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-navy shadow-sm backdrop-blur-sm">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {pinned && (
          <PushPinIcon
            size={14}
            weight="fill"
            aria-label={tp("pinnedBadge")}
            className="shrink-0 text-ocean-deep dark:text-ocean"
          />
        )}
        <p
          lang={isJa ? "ja" : undefined}
          title={album.name}
          className="truncate font-display text-[15px] font-semibold text-foreground"
        >
          {album.name}
        </p>
      </div>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        {album.year}
        {album.category && album.category !== "studio" && (
          <span
            className={
              album.category === "live" ? "text-coral-ink dark:text-coral" : ""
            }
          >
            {" · "}
            {tc(album.category)}
          </span>
        )}
      </p>
    </Link>
  );
}
