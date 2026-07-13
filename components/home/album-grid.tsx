import { BrowseGrid } from "@/components/browse-grid";
import type { Album } from "@/lib/api/types";
import { AlbumCard } from "./album-card";

/** The frosted-glass panel that floats over the hero photo, holding the album grid. */
export function AlbumGrid({
  albums,
  query,
}: {
  albums: Album[];
  query: string;
}) {
  return (
    <BrowseGrid
      columns="[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]"
      isEmpty={albums.length === 0}
      emptyBody={
        query ? `Nothing matches “${query}”.` : "Nothing here for this filter."
      }
    >
      {albums.map((album) => (
        <li key={album.id}>
          <AlbumCard album={album} />
        </li>
      ))}
    </BrowseGrid>
  );
}
