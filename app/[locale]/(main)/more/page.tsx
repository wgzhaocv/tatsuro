import { getTranslations, setRequestLocale } from "next-intl/server";
import { MoreView } from "@/components/more/more-view";
import { socialMeta } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return socialMeta(t("more"), t("moreDescription"));
}

export default async function MorePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MoreView />;
}
