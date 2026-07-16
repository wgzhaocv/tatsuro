import { getAlbum, getAlbums } from "@/lib/api/albums";
import { defaultEdition } from "@/lib/api/types";
import {
  albumOgPng,
  brandOgPng,
  OG_CONTENT_TYPE,
  OG_SIZE,
  pngResponse,
} from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// One card per release, prerendered at build (the discography is fixed). Locale
// is inherited from the [locale] layout's params; the card is language-neutral
// (album names aren't localized, and the cover carries any Japanese title). The
// render itself is cached bytes (albumOgPng), so this route has no uncached IO
// and prerenders statically under Cache Components — unknown ids still reach it
// at request time and fall back to the brand card.
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
  if (!album) return pngResponse(await brandOgPng());
  const edition = defaultEdition(album);
  const png = await albumOgPng({
    coverId: edition.coverFrontId,
    name: album.name,
    year: album.year,
    category: album.category,
  }).catch(() => null);
  return pngResponse(png ?? (await brandOgPng()));
}
