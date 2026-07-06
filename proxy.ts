import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME, REDIRECT_URL_COOKIE } from "@/lib/constants";

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

// The redirect cookie is client-writable, so only ever follow same-origin targets.
function resolveRedirect(saved: string | undefined, base: string): URL {
  const fallback = new URL("/", base);
  if (!saved) return fallback;
  try {
    const url = new URL(saved, base);
    if (
      url.origin !== fallback.origin ||
      url.pathname === "/gate" ||
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

  const isVerified = await verifyToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );
  const tokenFromParam = url.searchParams.get(AUTH_COOKIE_NAME);
  const isParamValid = await verifyToken(tokenFromParam);

  if (isVerified) {
    if (pathname === "/gate") {
      const saved = request.cookies.get(REDIRECT_URL_COOKIE)?.value;
      const response = NextResponse.redirect(
        resolveRedirect(saved, request.url),
      );
      response.cookies.delete(REDIRECT_URL_COOKIE);
      return response;
    }
    if (tokenFromParam) {
      // already verified — just clean the share token off the URL
      url.searchParams.delete(AUTH_COOKIE_NAME);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (isParamValid && tokenFromParam) {
    // share link: adopt the token as the auth cookie and clean the URL
    const saved = request.cookies.get(REDIRECT_URL_COOKIE)?.value;
    url.searchParams.delete(AUTH_COOKIE_NAME);
    const target =
      pathname === "/gate" ? resolveRedirect(saved, request.url) : url;
    const response = NextResponse.redirect(target);
    response.cookies.set(AUTH_COOKIE_NAME, tokenFromParam, AUTH_COOKIE_OPTIONS);
    response.cookies.delete(REDIRECT_URL_COOKIE);
    return response;
  }

  if (pathname !== "/gate") {
    const response = NextResponse.redirect(new URL("/gate", request.url));
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|serwist|.*\\.(?:png|jpg|jpeg|gif|ico|svg|js|css|woff|woff2)$).*)",
  ],
};
