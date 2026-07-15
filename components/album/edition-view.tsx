import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";
import { GlassPanel } from "@/components/glass-panel";
import {
  PlayQueueButton,
  QueuePlaybackProvider,
} from "@/components/track/playback-context";
import { buttonVariants } from "@/components/ui/button";
import {
  type AlbumDetail,
  type Edition,
  editionQueueSongs,
  editionSlug,
} from "@/lib/api/types";
import { coverUrl, editionZipUrl } from "@/lib/api/urls";
import { ARTIST } from "@/lib/constants";
import { durationLabel, formatFileSize } from "@/lib/format";
import { isJapanese } from "@/lib/text";
import { AlbumAmbient } from "./album-ambient";
import { DiscSection } from "./disc-section";
import { EditionSwitch } from "./edition-switch";
import { FadeImage } from "./fade-image";
import { ShareEditionButton } from "./share-edition-button";
import { SharedSongHighlight } from "./shared-song-highlight";

/**
 * One edition of a release, rendered fully on the server: the cover's ambient
 * wash, the identity rail (sticky on desktop so long sets like Opus keep their
 * cover in view), and the frosted tracklist sheet. Editions are sibling routes
 * (see EditionSwitch); the page above resolves which one this is.
 */
export async function EditionView({
  album,
  edition,
  locale,
}: {
  album: AlbumDetail;
  edition: Edition;
  locale: string;
}) {
  // Explicit locale keeps getTranslations static under Cache Components (no
  // request-locale/header read); the page passes it from its route params.
  const t = await getTranslations({ locale });
  const hasEditions = album.editions.length > 1;
  const multiDisc = edition.discs.length > 1;
  const cover = coverUrl(edition.coverFrontId);

  const trackCount = edition.discs.reduce((n, d) => n + d.tracks.length, 0);
  const seconds = edition.discs.reduce(
    (s, d) => s + d.tracks.reduce((t, tr) => t + (tr.duration ?? 0), 0),
    0,
  );
  const totalLabel = durationLabel(t, seconds);

  const metaLine = [
    album.year,
    album.category && t(`category.${album.category}`),
    t("album.songCount", { n: trackCount }),
    multiDisc ? t("album.discCount", { n: edition.discs.length }) : null,
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
  // Share targets this edition's own route: null slug = the default edition
  // (/album/:id), reissues carry their slug (/album/:id/:slug).
  const shareSlug =
    edition.id === album.defaultEditionId ? null : editionSlug(edition);

  return (
    <QueuePlaybackProvider
      songs={queueSongs}
      label={queueLabel}
      queueId={edition.id}
    >
      <AlbumAmbient cover={cover} />
      <SharedSongHighlight />

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

            <div className="mt-5 flex flex-col items-start gap-3 sm:mt-6">
              <div className="flex items-center gap-2">
                <PlayQueueButton
                  playText={t("album.play")}
                  pauseText={t("album.pause")}
                />
                <ShareEditionButton
                  albumId={album.id}
                  slug={shareSlug}
                  title={queueLabel}
                />
              </div>
              {edition.download && (
                <div className="flex flex-col items-start gap-1.5">
                  <a
                    href={editionZipUrl(edition.download.editionId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t("album.downloadNamed", {
                      name: album.name,
                      size: formatFileSize(edition.download.size),
                    })}
                    className={buttonVariants({ variant: "glass-ink" })}
                  >
                    <DownloadSimpleIcon
                      size={16}
                      data-icon="inline-start"
                      aria-hidden
                    />
                    {t("album.download")}
                  </a>
                  <span className="pl-1 text-xs text-muted-foreground">
                    {t("album.downloadMeta", {
                      size: formatFileSize(edition.download.size),
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {hasEditions && (
            <div className="col-span-2 sm:col-span-1 sm:col-start-2 lg:w-full">
              <EditionSwitch
                album={album}
                currentEditionId={edition.id}
                locale={locale}
              />
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
              locale={locale}
            />
          ))}

          <p className="mt-8 border-t border-border/70 px-3 pt-5 text-[13px] text-muted-foreground">
            {[
              album.year && t("album.released", { year: album.year }),
              t("album.songCount", { n: trackCount }),
              totalLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </GlassPanel>
      </div>
    </QueuePlaybackProvider>
  );
}
