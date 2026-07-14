import { getTranslations, setRequestLocale } from "next-intl/server";
import { MvBrowser } from "@/components/mv/mv-browser";
import { SectionHero } from "@/components/section-hero";
import { getMvs } from "@/lib/api/mv";
import { socialMeta } from "@/lib/site";
import beachDusk from "../_assets/home-dusk.jpg";
import beachNoon from "../_assets/home-noon.jpg";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return socialMeta(t("musicVideos"), t("mvDescription"));
}

export default async function MvPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mvs = await getMvs();

  return (
    <SectionHero noon={beachNoon} dusk={beachDusk}>
      <MvBrowser mvs={mvs} />
    </SectionHero>
  );
}
