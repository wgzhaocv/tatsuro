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
      {albums.map((album) => (
        <li key={album.id}>
          <AlbumCard album={album} />
        </li>
      ))}
    </BrowseGrid>
  );
}
