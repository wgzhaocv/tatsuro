import type { MetadataRoute } from "next";
import { ARTIST } from "@/lib/constants";

// Web App Manifest → served at /manifest.webmanifest (Next file convention).
// theme_color / background_color are single-valued (no per-theme switch), so
// they pin the install identity + splash to the dusk palette: #12263A is
// --color-dusk-navy, the .dark background. A noon-mode launch shows one dusk
// splash frame before the light content paints — an accepted cost of a single
// window color. The LIVE browser/standalone bar still follows the active theme
// via viewport.themeColor (media array) in app/layout.tsx.
//
// Icons: icon.svg is the theme-adaptive "any" mark; Android crops maskable
// icons to a squircle, so those are filled dusk tiles (app/icons/*.png).
// This route must stay outside the password gate — see proxy.ts matcher.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: ARTIST,
    short_name: "Tatsuro",
    description: "The complete discography of Tatsuro Yamashita.",
    start_url: "/",
    display: "standalone",
    theme_color: "#12263A",
    background_color: "#12263A",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
