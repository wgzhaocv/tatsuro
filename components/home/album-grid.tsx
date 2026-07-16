import { useTranslations } from "next-intl";
import { BrowseGrid } from "@/components/browse-grid";
import type { Album } from "@/lib/api/types";
import { AlbumCard } from "./album-card";

/** The frosted-glass panel that floats over the hero photo, holding the album grid. */
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
          {/* This grid owns the reorder (pins float to the front), so it opts
              the cards into the slot-to-slot view transition. */}
          <AlbumCard album={album} reorderable />
        </li>
      ))}
    </BrowseGrid>
  );
}
