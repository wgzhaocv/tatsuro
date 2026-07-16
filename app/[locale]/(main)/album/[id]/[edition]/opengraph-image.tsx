import { getAlbum, getAlbums } from "@/lib/api/albums";
import { editionSlug, findEdition } from "@/lib/api/types";
import {
  albumOgPng,
  brandOgPng,
  OG_CONTENT_TYPE,
  OG_SIZE,
  pngResponse,
} from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// One card per non-default edition (reissue), mirroring the page's params — the
// default edition's card lives one level up at /album/:id. Statically
// prerendered (the render is cached bytes; see that route for the details).
export async function generateStaticParams() {
  const albums = await getAlbums();
  const details = await Promise.all(albums.map((a) => getAlbum(a.id)));
  return details.flatMap((album) =>
    album.editions
      .filter((e) => e.id !== album.defaultEditionId)
      .map((e) => ({ id: album.id, edition: editionSlug(e) })),
  );
}

export default async function EditionOpengraphImage({
  params,
}: {
  params: Promise<{ locale: string; id: string; edition: string }>;
}) {
  const { id, edition: slug } = await params;
  const album = await getAlbum(id).catch(() => null);
  const edition = album && findEdition(album, decodeURIComponent(slug));
  if (!album || !edition) return pngResponse(await brandOgPng());
  const png = await albumOgPng({
    coverId: edition.coverFrontId,
    name: album.name,
    year: edition.year ?? album.year,
    category: album.category,
  }).catch(() => null);
  return pngResponse(png ?? (await brandOgPng()));
}
