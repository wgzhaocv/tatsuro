import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EditionView } from "@/components/album/edition-view";
import { getAlbum, getAlbums } from "@/lib/api/albums";
import { editionSlug, findEdition, nameLang } from "@/lib/api/types";

// /album/:id/:edition — a specific pressing, addressed by year (e.g.
// /album/…/1986). The default edition's canonical home is /album/:id, so only
// non-default editions are prerendered here; anything unresolvable falls
// through to the themed 404.
export async function generateStaticParams() {
  const albums = await getAlbums();
  const details = await Promise.all(albums.map((a) => getAlbum(a.id)));
  return details.flatMap((album) =>
    album.editions
      .filter((e) => e.id !== album.defaultEditionId)
      .map((e) => ({ id: album.id, edition: editionSlug(e) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string; edition: string }>;
}) {
  const { locale, id, edition: slug } = await params;
  const album = await getAlbum(id, nameLang(locale)).catch(() => null);
  const edition = album && findEdition(album, decodeURIComponent(slug));
  return {
    title:
      album && edition
        ? `${album.name} (${edition.label}) — Tatsuro Yamashita`
        : "Tatsuro Yamashita",
  };
}

export default async function EditionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; edition: string }>;
}) {
  const { locale, id, edition: slug } = await params;
  setRequestLocale(locale);
  const album = await getAlbum(id, nameLang(locale)).catch(() => notFound());
  const edition = findEdition(album, decodeURIComponent(slug));
  if (!edition) notFound();
  return <EditionView album={album} edition={edition} locale={locale} />;
}
