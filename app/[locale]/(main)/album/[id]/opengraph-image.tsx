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

// One card per release. NOTE: despite generateStaticParams, metadata routes
// don't land in the prerender manifest under Cache Components today — each
// card is rendered on its first request after a deploy and static-cached from
// then on (albumOgPng's 'use cache' keeps the cover fetch + satori bytes
// across deploys, so that first hit is usually cheap too). Only unfurl bots
// ever pay it. Locale is inherited from the [locale] layout's params; the card
// is language-neutral (album names aren't localized, and the cover carries any
// Japanese title). Unknown ids fall back to the brand card.
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
