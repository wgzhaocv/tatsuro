// Per-locale messages are static content. Marking the async import as a cached
// function means that under Cache Components (cacheComponents: true) loading
// messages counts as cached data — not "uncached data accessed outside
// <Suspense>". Shared by i18n/request.ts (server APIs) and the [locale] layout
// (explicit messages for NextIntlClientProvider, so it doesn't auto-load them
// through an uncached path).
export async function getMessagesFor(locale: string) {
  "use cache";
  return (await import(`../messages/${locale}.json`)).default;
}

// Static intl config passed explicitly to getRequestConfig + NextIntlClientProvider
// so next-intl never falls back to request-scoped / ambient getters (timeZone,
// now, formats). Those read uncached data under Cache Components and break
// prerender. We render no dates, so these are inert but must be constant and
// live in ONE place (imported by i18n/request.ts and app/[locale]/layout.tsx).
export const TIME_ZONE = "Asia/Tokyo";
export const STATIC_NOW = new Date("2025-01-01T00:00:00Z");
export const STATIC_FORMATS = {};
