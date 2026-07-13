import { setRequestLocale } from "next-intl/server";
import { AlbumBrowser } from "@/components/home/album-browser";
import { SectionHero } from "@/components/section-hero";
import { getAlbums } from "@/lib/api/albums";
import beachDusk from "./_assets/home-dusk.jpg";
import beachNoon from "./_assets/home-noon.jpg";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const albums = await getAlbums();

  return (
    <SectionHero noon={beachNoon} dusk={beachDusk}>
      <AlbumBrowser albums={albums} />
    </SectionHero>
  );
}
