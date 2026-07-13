import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaylistsBrowser } from "@/components/playlists/playlists-browser";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: `${t("playlists")} — Tatsuro Yamashita` };
}

export default async function PlaylistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaylistsBrowser />;
}
