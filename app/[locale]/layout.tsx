import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { HtmlLang } from "@/components/i18n/html-lang";
import {
  getMessagesFor,
  STATIC_FORMATS,
  STATIC_NOW,
  TIME_ZONE,
} from "@/i18n/messages";
import { routing } from "@/i18n/routing";

// One static branch per locale; inner pages' generateStaticParams compose with this.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Opt this subtree into static rendering for the resolved locale.
  setRequestLocale(locale);
  // Pass EVERY provider value explicitly (all static) so NextIntlClientProvider
  // never falls back to its getters (getMessages/getFormats/getTimeZone/
  // getConfigNow) — those read the request config and the ambient system time
  // zone, which under Cache Components is uncached data and breaks prerender.
  // We render no dates, so now/timeZone/formats are inert placeholders.
  const messages = await getMessagesFor(locale);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={TIME_ZONE}
      now={STATIC_NOW}
      formats={STATIC_FORMATS}
    >
      <HtmlLang />
      {children}
    </NextIntlClientProvider>
  );
}
