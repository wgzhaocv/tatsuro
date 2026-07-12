import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * App-internal link. Scroll on navigation is owned by PageScroll (per-route
 * scroll memory), so Next's own scroll-to-top is off by default here — a raw
 * next/link would fight it and yank the window on every click. Import this
 * everywhere in the app, same API otherwise.
 */
export function Link({
  scroll = false,
  ...props
}: ComponentProps<typeof NextLink>) {
  return <NextLink scroll={scroll} {...props} />;
}
