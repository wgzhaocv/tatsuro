import { useTranslations } from "next-intl";
import { BrowseGrid } from "@/components/browse-grid";
import type { Album } from "@/lib/api/types";
import { AlbumCard } from "./album-card";

/** The frosted-glass panel that floats over the hero photo, holding the album
 *  grid. Pinned albums sort to the front (see AlbumBrowser); the reorder is
 *  instant — no animation. */
export function AlbumGrid({ albums }: { albums: Album[] }) {
  const t = useTranslations("browse");
  return (
    <BrowseGrid
      columns="[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]"
      isEmpty={albums.length === 0}
      emptyBody={t("albumsEmpty")}
    >
      {albums.map((album, i) => (
        <li key={album.id}>
          {/* Eager-load the first row's covers (widest first row = desktop ~6
              cols; the rest stay lazy), but mark only the first two
              fetchpriority=high — the hero photo is the LCP and shouldn't
              race six covers for bandwidth. */}
          <AlbumCard album={album} eager={i < 6} high={i < 2} />
        </li>
      ))}
    </BrowseGrid>
  );
}
