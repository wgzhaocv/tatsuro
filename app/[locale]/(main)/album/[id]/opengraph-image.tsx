import { getAlbum, getAlbums } from "@/lib/api/albums";
import { defaultEdition } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import { albumOgImage, brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// One card per release, prerendered at build (the discography is fixed). Locale
// is inherited from the [locale] layout's params; the card is language-neutral
// (album names aren't localized, and the cover carries any Japanese title).
export async function generateStaticParams() {
  const albums = await getAlbums();
  return albums.map((album) => ({ id: album.id }));
}

export default async function AlbumOpengraphImage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const album = await getAlbum(id).catch(() => null);
  if (!album) return brandOgImage();
  const edition = defaultEdition(album);
  return albumOgImage({
    cover: coverUrl(edition.coverFrontId),
    name: album.name,
    year: album.year,
    category: album.category,
  });
}
