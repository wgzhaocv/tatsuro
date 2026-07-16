import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  PlaylistDetail,
  PlaylistDetailSkeleton,
} from "@/components/playlists/playlist-detail";

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

// A playlist id is client-generated (crypto.randomUUID / "liked"), so it can't
// be enumerated at build. Under Cache Components the id-bearing params read must
// sit inside a Suspense boundary — the section layout renders a static shell and
// this detail streams in as the one dynamic hole.
export default function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  return (
    <Suspense fallback={<PlaylistDetailSkeleton />}>
      <PlaylistDetailRoute params={params} />
    </Suspense>
  );
}

async function PlaylistDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <PlaylistDetail id={id} />;
}
