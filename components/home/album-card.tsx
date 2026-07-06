import Image from "next/image";
import Link from "next/link";
import type { Album } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";

// Content data is often Japanese; tag it so :lang(ja) picks up Zen Maru Gothic.
const JP = /[぀-ヿ㐀-鿿]/;

const CATEGORY_LABEL: Record<string, string> = {
  studio: "Studio",
  live: "Live",
  compilation: "Compilation",
};

/** A postcard: square cover + name + year, links to the album. */
export function AlbumCard({ album }: { album: Album }) {
  const isJa = JP.test(album.name);
  const badge =
    album.discCount > 1
      ? `${album.discCount} CD`
      : album.editionCount > 1
        ? `${album.editionCount} versions`
        : null;

  return (
    <Link
      href={`/album/${album.id}`}
      aria-label={album.year ? `${album.name}, ${album.year}` : album.name}
      className="group block rounded-2xl focus:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-secondary shadow-postcard transition duration-500 ease-lazy group-hover:-translate-y-1.5 group-hover:shadow-lift-ocean group-focus-visible:-translate-y-1.5 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background">
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
              album.category === "live" ? "text-coral-ink dark:text-coral" : ""
            }
          >
            {" · "}
            {CATEGORY_LABEL[album.category]}
          </span>
        )}
      </p>
    </Link>
  );
}
