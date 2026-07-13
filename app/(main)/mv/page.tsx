import type { Metadata } from "next";
import { MvBrowser } from "@/components/mv/mv-browser";
import { PageScroll } from "@/components/page-scroll";
import { ThemeImage } from "@/components/theme-image";
import { getMvs } from "@/lib/api/mv";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

export const metadata: Metadata = {
  title: "Music Videos — Tatsuro Yamashita",
};

export default async function MvPage() {
  const mvs = await getMvs();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <PageScroll />
      {/* Same immersive surface as home: the beach photo fixed behind, a light
          navy scrim up top (Light Overlay Rule) so the white chrome reads. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-0 h-screen w-screen"
      >
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

      <MvBrowser mvs={mvs} />
    </div>
  );
}
