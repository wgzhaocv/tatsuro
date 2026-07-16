import Image from "next/image";
import { useTranslations } from "next-intl";
import { PinButton } from "@/components/pins/pin-button";
import { Link } from "@/components/ui/link";
import type { Album } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
// Content data is often Japanese; tag it so :lang(ja) picks up the JP gothic stack.
import { isJapanese } from "@/lib/text";

/** A postcard: square cover + name + year, links to the album. The pin toggle
 *  is a sibling of the Link (not nested — a button inside an anchor is invalid),
 *  overlaid on the cover's top-left corner.
 *
 *  `reorderable` opts the card into a view-transition-name so a grid that
 *  reorders (the home grid, when a pin floats an album to the front) can tween
 *  it between slots. It's off by default: the name must be unique per document
 *  during a transition, a guarantee only the owning surface can make, so it
 *  stays with the grid rather than baked into this reusable leaf. */
export function AlbumCard({
  album,
  reorderable,
}: {
  album: Album;
  reorderable?: boolean;
}) {
  const tc = useTranslations("category");
  const ta = useTranslations("album");
  const isJa = isJapanese(album.name);
  const badge =
    album.discCount > 1
      ? ta("cd", { n: album.discCount })
      : album.editionCount > 1
        ? ta("versions", { n: album.editionCount })
        : null;

  return (
    <div
      className="group/card relative"
      style={
        reorderable ? { viewTransitionName: `album-${album.id}` } : undefined
      }
    >
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
            sizes="(max-width: 640px) 45vw, 230px"
            className="object-cover"
          />
          {badge && (
            <span className="absolute right-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-navy shadow-sm backdrop-blur-sm">
              {badge}
            </span>
          )}
        </div>
        <p
          lang={isJa ? "ja" : undefined}
          title={album.name}
          className="mt-3 truncate font-display text-[15px] font-semibold text-foreground"
        >
          {album.name}
        </p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {album.year}
          {album.category && album.category !== "studio" && (
            <span
              className={
                album.category === "live"
                  ? "text-coral-ink dark:text-coral"
                  : ""
              }
            >
              {" · "}
              {tc(album.category)}
            </span>
          )}
        </p>
      </Link>
      <PinButton
        albumId={album.id}
        name={album.name}
        reveal
        className="absolute left-2 top-2"
      />
    </div>
  );
}
