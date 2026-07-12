import { GlassPanel } from "@/components/glass-panel";
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
    <GlassPanel className="mt-1 flex-1 rounded-t-[28px] border-b-0 px-4 pb-28 pt-6 shadow-[0_-24px_60px_-34px_rgba(11,58,83,0.5)] sm:mx-5 sm:px-6">
      {albums.length > 0 ? (
        <ul className="grid gap-x-5 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
          {albums.map((album) => (
            <li key={album.id}>
              <AlbumCard album={album} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-1.5 py-20 text-center">
          <p className="font-display text-lg font-medium text-foreground">
            No results
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {query
              ? `Nothing matches “${query}”.`
              : "Nothing here for this filter."}
          </p>
        </div>
      )}
    </GlassPanel>
  );
}
