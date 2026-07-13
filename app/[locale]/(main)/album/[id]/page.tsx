import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EditionView } from "@/components/album/edition-view";
import { getAlbum, getAlbums } from "@/lib/api/albums";
import { defaultEdition, nameLang } from "@/lib/api/types";

// /album/:id — the release's default (latest) edition. Reissues live at
// /album/:id/:year (see [edition]/page.tsx). The catalog is a fixed
// discography: prerender every release at build time. Under cacheComponents,
// unknown ids still reach the page at request time — getAlbum rejects and we
// hand them the themed 404 in ../not-found.tsx.
export async function generateStaticParams() {
  const albums = await getAlbums();
  return albums.map((album) => ({ id: album.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const album = await getAlbum(id, nameLang(locale)).catch(() => null);
  return {
    title: album ? `${album.name} — Tatsuro Yamashita` : "Tatsuro Yamashita",
  };
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const album = await getAlbum(id, nameLang(locale)).catch(() => notFound());
  return (
    <EditionView
      album={album}
      edition={defaultEdition(album)}
      locale={locale}
    />
  );
}
