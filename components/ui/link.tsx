import type { ComponentProps } from "react";
import { Link as IntlLink } from "@/i18n/navigation";

/**
 * App-internal link. Wraps next-intl's locale-aware Link, which auto-prefixes
 * the active locale, and keeps scroll={false} by default — scroll on navigation
 * is owned by PageScroll (per-route scroll memory); a raw link would fight it
 * and yank the window on every click. Import this everywhere in the app.
 * Backend URLs (downloads/streams/covers) use a plain <a>, so they never pass
 * through here and stay un-prefixed.
 */
export function Link({
  scroll = false,
  ...props
}: ComponentProps<typeof IntlLink>) {
  return <IntlLink scroll={scroll} {...props} />;
}
