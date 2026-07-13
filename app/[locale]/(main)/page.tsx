import { setRequestLocale } from "next-intl/server";
import { AlbumBrowser } from "@/components/home/album-browser";
import { PageScroll } from "@/components/page-scroll";
import { ThemeImage } from "@/components/theme-image";
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
    <div className="relative flex min-h-dvh flex-col">
      <PageScroll />
      {/* Immersive photo surface: one beach photo fills the viewport (fixed), the
          grid frosts over it. Per theme + a light navy scrim up top (Light Overlay
          Rule) so the white chrome stays legible. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0">
          <ThemeImage
            noon={beachNoon}
            dusk={beachDusk}
            sizes="100vw"
            noonClassName="object-[50%_68%]"
            duskClassName="object-[50%_46%]"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,58,83,0.42),rgba(11,58,83,0.14)_26%,rgba(11,58,83,0)_54%)] dark:bg-[linear-gradient(to_bottom,rgba(18,38,58,0.52),rgba(18,38,58,0.2)_26%,rgba(18,38,58,0.04)_54%)]" />
      </div>

      <AlbumBrowser albums={albums} />
    </div>
  );
}
