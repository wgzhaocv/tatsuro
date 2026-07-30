import { setRequestLocale } from "next-intl/server";
import { PlaylistsBrowser } from "@/components/playlists/playlists-browser";

// Metadata (title + social) comes from the section layout, which resolves the
// same "playlists" strings for the detail route too.
export default async function PlaylistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaylistsBrowser />;
}
