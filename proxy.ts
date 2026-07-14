import { type NextRequest, NextResponse, userAgent } from "next/server";
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
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // /demo is dev-only: gated like everything else, but never localized.
  const isDemo = pathname === "/demo" || pathname.startsWith("/demo/");
  const locale = pathLocale(pathname);
  // Pass a request through to the app: locale-rewrite it unless it's /demo.
  const passThrough = () =>
    isDemo ? NextResponse.next() : intlMiddleware(request);

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
    return passThrough();
  }

  // Only unverified visitors reach here — validate a share-link token lazily
  // (the common no-param case skips the HMAC; see verifyToken).
  const isParamValid = await verifyToken(tokenFromParam);
  if (isParamValid && tokenFromParam) {
    // A share link carrying a valid token. Bots don't reliably keep the cookie
    // across the token-stripping redirect, so serve the page directly with the
    // token still in the URL — the preview then unfurls the real content OG.
    // Humans get the clean-URL + cookie treatment.
    if (userAgent(request).isBot) {
      return passThrough();
    }
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
    // Unauthenticated — send them to the gate. Link-preview bots on a tokenless
    // share follow this redirect and unfurl the gate's "password required" OG
    // rather than any real content, so a bare link never leaks what it points to.
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
  return passThrough();
}

export const config = {
  // The negative-lookahead is the single source of truth for what the gate does
  // NOT guard: Next internals, static assets by extension, and public metadata
  // routes — icons, sitemap/robots, and the opengraph/twitter image routes
  // (link-preview bots must fetch a page's og:image without hitting the gate;
  // the URLs aren't discoverable without an already-served page, and cover art
  // is already public via the backend).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|apple-icon$|sitemap.xml|robots.txt|sw.js|serwist|.*opengraph-image|.*twitter-image|.*\\.(?:png|jpg|jpeg|gif|ico|svg|js|css|woff|woff2)$).*)",
  ],
};
