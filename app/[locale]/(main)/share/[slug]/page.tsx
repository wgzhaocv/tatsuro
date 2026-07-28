import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { PlaylistDetailSkeleton } from "@/components/playlists/playlist-detail-skeleton";
import { ShareUnavailable } from "@/components/share/share-unavailable";
import { SharedPlaylistView } from "@/components/share/shared-playlist-view";
import { fetchSharedPlaylist } from "@/lib/api/share";
import { nameLang } from "@/lib/api/types";
import { socialMeta } from "@/lib/site";

// Generic, playlist-agnostic metadata on purpose: the title would otherwise leak
// the playlist's name (and existence) to anyone probing slugs, and building it
// would mean an uncached fetch inside generateMetadata on every request.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return socialMeta(t("sharedPlaylist"), t("sharedPlaylistDescription"));
}

// A share slug is minted at runtime, so it can't be enumerated at build — and the
// read behind it is uncached by design. Under Cache Components the params read
// plus that fetch must sit inside a Suspense boundary: the section layout renders
// the static shell and this streams in as the one dynamic hole.
export default function SharedPlaylistPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return (
    <Suspense fallback={<PlaylistDetailSkeleton />}>
      <SharedPlaylistRoute params={params} />
    </Suspense>
  );
}

async function SharedPlaylistRoute({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const shared = await fetchSharedPlaylist(slug, nameLang(locale));
  if (!shared) return <ShareUnavailable />;

  const t = await getTranslations({ locale, namespace: "share" });
  const owner = shared.ownerName?.trim() || t("unknownOwner");
  const title =
    shared.kind === "liked"
      ? t("likedSongsTitle", { name: owner })
      : shared.name;

  return (
    <SharedPlaylistView
      slug={slug}
      kind={shared.kind}
      title={title}
      owner={owner}
      coverId={shared.coverId}
      songs={shared.songs}
    />
  );
}
