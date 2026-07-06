import type { Album } from "@/lib/api/types";
import { AlbumCard } from "./album-card";
import type { FilterKey } from "./album-filters";

/** The frosted-glass panel that floats over the hero photo, holding the album grid. */
export function AlbumGrid({
  albums,
  query,
  filter,
}: {
  albums: Album[];
  query: string;
  filter: FilterKey;
}) {
  const narrowed = filter !== "all" || query.trim() !== "";

  return (
    <div className="mt-1 flex-1 rounded-t-[28px] border border-b-0 border-white/55 bg-white/45 px-4 pb-28 pt-6 shadow-[0_-24px_60px_-34px_rgba(11,58,83,0.5)] backdrop-blur-sm sm:mx-5 sm:px-6 dark:border-white/15 dark:bg-[rgba(18,38,58,0.62)]">
      {narrowed && (
        <p
          className="mb-5 text-[13px] text-muted-foreground"
          aria-live="polite"
        >
          {albums.length} {albums.length === 1 ? "album" : "albums"}
        </p>
      )}

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
    </div>
  );
}
