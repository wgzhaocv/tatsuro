import { redirect } from "next/navigation";

/**
 * Unmatched URLs bounce straight home (roadmap #9): a private site has no
 * audience for a dead-end 404 screen. Known-route misses keep their own
 * themed pages (e.g. app/(main)/album/not-found.tsx).
 */
export default function NotFound() {
  redirect("/");
}
