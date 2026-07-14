import type { MetadataRoute } from "next";

// A private, password-gated library — nothing here should be indexed by search
// engines. Link-preview bots ignore robots.txt for on-demand unfurls, so shared
// links still get their OpenGraph card (see proxy.ts + app/**/opengraph-image).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
