import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MvWatch } from "@/components/mv/mv-watch";
import { getMvs } from "@/lib/api/mv";

// /mv/:id — the watch screen for one video. The catalog is small and fixed:
// prerender every video at build time. Unknown ids reach the page at request
// time and land on the themed 404 (same contract as album/[id]).
export async function generateStaticParams() {
  const mvs = await getMvs();
  return mvs.map((mv) => ({ id: mv.id }));
}

// No per-id endpoint (backend only exposes /mv/list) — find in the cached
// catalog; getMvs is 'use cache', so this is one fetch total.
async function findMv(id: string) {
  return (await getMvs()).find((m) => m.id === id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mv = await findMv(id);
  // Bare title: the root layout's template appends "— {ARTIST}" (spelling it
  // out here rendered the artist twice). No mv → inherit the site defaults.
  return mv ? { title: mv.name } : {};
}

export default async function MvWatchPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const mv = await findMv(id);
  if (!mv) notFound();
  return <MvWatch mv={mv} />;
}
