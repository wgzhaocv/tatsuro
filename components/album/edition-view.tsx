import { GlassPanel } from "@/components/glass-panel";
import {
  type AlbumCategory,
  type AlbumDetail,
  type Edition,
  editionQueueSongs,
} from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import { ARTIST } from "@/lib/constants";
import { formatTotalDuration } from "@/lib/format";
import { isJapanese } from "@/lib/text";
import { AlbumAmbient } from "./album-ambient";
import { DiscSection } from "./disc-section";
import { EditionPlaybackProvider, PlayEditionButton } from "./edition-playback";
import { EditionSwitch } from "./edition-switch";
import { FadeImage } from "./fade-image";

const CATEGORY_LABEL: Record<AlbumCategory, string> = {
  studio: "Studio",
  live: "Live",
  compilation: "Compilation",
};

/**
 * One edition of a release, rendered fully on the server: the cover's ambient
 * wash, the identity rail (sticky on desktop so long sets like Opus keep their
 * cover in view), and the frosted tracklist sheet. Editions are sibling routes
 * (see EditionSwitch); the page above resolves which one this is.
 */
export function EditionView({
  album,
  edition,
}: {
  album: AlbumDetail;
  edition: Edition;
}) {
  const hasEditions = album.editions.length > 1;
  const multiDisc = edition.discs.length > 1;
  const cover = coverUrl(edition.coverFrontId);

  const trackCount = edition.discs.reduce((n, d) => n + d.tracks.length, 0);
  const seconds = edition.discs.reduce(
    (s, d) => s + d.tracks.reduce((t, tr) => t + (tr.duration ?? 0), 0),
    0,
  );
  const totalLabel = seconds > 0 ? formatTotalDuration(seconds) : null;

  const metaLine = [
    album.year,
    album.category && CATEGORY_LABEL[album.category],
    `${trackCount} ${trackCount === 1 ? "song" : "songs"}`,
    multiDisc ? `${edition.discs.length} discs` : null,
    totalLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  const queueSongs = editionQueueSongs(album, edition);
  let offset = 0;
  const discStarts = edition.discs.map((disc) => {
    const start = offset;
    offset += disc.tracks.length;
    return start;
  });
  const queueLabel =
    hasEditions && edition.year != null
      ? `${album.name} (${edition.year})`
      : album.name;

  return (
    <EditionPlaybackProvider songs={queueSongs} label={queueLabel}>
      <AlbumAmbient cover={cover} />

      <div className="mx-auto w-full max-w-6xl px-5 pt-2 pb-20 sm:px-8 lg:grid lg:grid-cols-[18.5rem_1fr] lg:items-start lg:gap-12 lg:pt-6">
        {/* ── Identity rail. Phones/tablets: cover-beside-identity grid row,
            with the actions spanning the full width on phones (chips get room
            to sit side by side); a column once the lg sticky rail kicks in. ── */}
        <aside className="grid grid-cols-[8rem_1fr] items-center gap-x-5 sm:grid-cols-[14rem_1fr] sm:gap-x-7 lg:sticky lg:top-8 lg:flex lg:flex-col lg:items-start">
          <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-secondary shadow-postcard sm:rounded-[20px]">
            <FadeImage
              src={cover}
              priority
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 240px, 296px"
            />
          </div>

          <div className="flex min-w-0 flex-col items-start">
            <h1
              lang={isJapanese(album.name) ? "ja" : undefined}
              className="font-display text-2xl leading-[1.15] font-medium text-foreground sm:text-[2.375rem] sm:leading-[1.12] lg:mt-6"
            >
              {album.name}
            </h1>
            <p className="mt-2 text-[15px] font-medium text-foreground">
              {ARTIST}
            </p>
            <p className="mt-1.5 text-sm text-foreground/85">{metaLine}</p>

            <div className="mt-5 sm:mt-6">
              <PlayEditionButton />
            </div>
          </div>

          {hasEditions && (
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 lg:w-full">
              <EditionSwitch album={album} currentEditionId={edition.id} />
            </div>
          )}
        </aside>

        {/* ── Tracklist sheet: one frosted layer over the wash, same subtle
            glass as the home grid panel ── */}
        <GlassPanel
          as="main"
          className="mt-10 rounded-[28px] px-3 py-6 shadow-postcard sm:px-6 lg:mt-0"
        >
          {edition.discs.map((disc, d) => (
            <DiscSection
              key={disc.id}
              disc={disc}
              showHeading={multiDisc}
              startIndex={discStarts[d]}
            />
          ))}

          <p className="mt-8 border-t border-border/70 px-3 pt-5 text-[13px] text-muted-foreground">
            {[
              album.year && `Released ${album.year}`,
              `${trackCount} songs`,
              totalLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </GlassPanel>
      </div>
    </EditionPlaybackProvider>
  );
}
