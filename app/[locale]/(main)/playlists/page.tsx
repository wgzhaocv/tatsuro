import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaylistsBrowser } from "@/components/playlists/playlists-browser";
import { socialMeta } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return socialMeta(t("playlists"), t("playlistsDescription"));
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
