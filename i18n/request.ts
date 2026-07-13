import { getRequestConfig } from "next-intl/server";
import { getMessagesFor, TIME_ZONE } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (
    !locale ||
    !routing.locales.includes(locale as (typeof routing.locales)[number])
  ) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: await getMessagesFor(locale),
    // Pin the time zone (see messages.ts) so next-intl doesn't read the ambient
    // system zone — uncached data under Cache Components.
    timeZone: TIME_ZONE,
  };
});
