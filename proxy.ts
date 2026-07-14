import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { verifyToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME, REDIRECT_URL_COOKIE } from "@/lib/constants";

// next-intl handles locale routing (/ → /{locale}, Accept-Language + NEXT_LOCALE
// cookie negotiation, locale prefixing). We compose it with the password gate:
// unprefixed paths get a locale from next-intl first, then auth runs on the
// prefixed hop; the gate itself now lives at /{locale}/gate.
const intlMiddleware = createMiddleware(routing);
const { locales, defaultLocale } = routing;

// Link-preview bots skip auth so shared links unfurl (same trade-off as the old site).
const crawlers = [
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "whatsapp",
  "telegram",
  "slackbot-linkexpanding",
  "slackbot",
  "slack",
  "discordbot",
  "microsoft teams",
  "pinterest",
  "embedly",
  "googlebot",
  "bingbot",
  "snapchat",
  "redditbot",
  "qwantify",
  "applebot",
  "amazonadbot",
];
const CRAWLER_PATTERN = new RegExp(crawlers.join("|"), "i");

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

/** The locale prefix at the start of a path, or null if there isn't one. */
function pathLocale(pathname: string): string | null {
  const seg = pathname.split("/")[1];
  return locales.includes(seg as (typeof locales)[number]) ? seg : null;
}

// The redirect cookie is client-writable, so only ever follow same-origin targets.
// Fallback lands on the localized home so post-login never leaves the locale.
function resolveRedirect(
  saved: string | undefined,
  base: string,
  locale: string,
): URL {
  const fallback = new URL(`/${locale}`, base);
  if (!saved) return fallback;
  try {
    const url = new URL(saved, base);
    if (
      url.origin !== fallback.origin ||
      url.pathname.endsWith("/gate") ||
      url.pathname.startsWith("/.") // e.g. /.well-known probes — never a page
    ) {
      return fallback;
    }
    return url;
  } catch {
    return fallback;
  }
}

export async function proxy(request: NextRequest) {
  if (CRAWLER_PATTERN.test(request.headers.get("user-agent") ?? "")) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const { pathname } = url;

  // /demo is dev-only: gated like everything else, but never localized.
  const isDemo = pathname === "/demo" || pathname.startsWith("/demo/");
  const locale = pathLocale(pathname);

  // Unprefixed localizable path → let next-intl attach a locale prefix
  // (NEXT_LOCALE cookie > Accept-Language). Auth runs on the prefixed hop.
  if (!locale && !isDemo) {
    return intlMiddleware(request);
  }

  const activeLocale = locale ?? defaultLocale;
  const isGate = pathname === `/${activeLocale}/gate`;

  const isVerified = await verifyToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );
  const tokenFromParam = url.searchParams.get(AUTH_COOKIE_NAME);
  const isParamValid = await verifyToken(tokenFromParam);

  if (isVerified) {
    if (isGate) {
      const saved = request.cookies.get(REDIRECT_URL_COOKIE)?.value;
      const response = NextResponse.redirect(
        resolveRedirect(saved, request.url, activeLocale),
      );
      response.cookies.delete(REDIRECT_URL_COOKIE);
      return response;
    }
    if (tokenFromParam) {
      // already verified — just clean the share token off the URL
      url.searchParams.delete(AUTH_COOKIE_NAME);
      return NextResponse.redirect(url);
    }
    // Pass through; let next-intl set NEXT_LOCALE / rewrite for localized paths.
    return isDemo ? NextResponse.next() : intlMiddleware(request);
  }

  if (isParamValid && tokenFromParam) {
    // share link: adopt the token as the auth cookie and clean the URL
    const saved = request.cookies.get(REDIRECT_URL_COOKIE)?.value;
    url.searchParams.delete(AUTH_COOKIE_NAME);
    const target = isGate
      ? resolveRedirect(saved, request.url, activeLocale)
      : url;
    const response = NextResponse.redirect(target);
    response.cookies.set(AUTH_COOKIE_NAME, tokenFromParam, AUTH_COOKIE_OPTIONS);
    response.cookies.delete(REDIRECT_URL_COOKIE);
    return response;
  }

  if (!isGate) {
    // activeLocale is defaultLocale for demo (which never carries a prefix).
    const response = NextResponse.redirect(
      new URL(`/${activeLocale}/gate`, request.url),
    );
    // Only remember real page navigations. Background/subresource requests
    // (Chrome's /.well-known devtools probe, prefetches, fetch()) also pass
    // through here unauthenticated; without this guard the last one to hit the
    // proxy clobbers the saved destination, so login lands on e.g. the devtools
    // JSON path instead of the page the visitor actually opened.
    if (request.headers.get("sec-fetch-dest") === "document") {
      response.cookies.set(REDIRECT_URL_COOKIE, request.url, {
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour — enough to finish verification
      });
    }
    return response;
  }

  // Unverified on the gate itself — render it (localized via the [locale] layout).
  return isDemo ? NextResponse.next() : intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|apple-icon$|sitemap.xml|robots.txt|sw.js|serwist|.*\\.(?:png|jpg|jpeg|gif|ico|svg|js|css|woff|woff2)$).*)",
  ],
};
