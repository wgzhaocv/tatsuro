import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware navigation. `Link` auto-prefixes the active locale; `usePathname`
// returns the pathname WITHOUT the locale prefix (so match predicates stay simple).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
