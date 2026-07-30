"use client";

import { type ComponentProps, useState } from "react";
import { Link as IntlLink } from "@/i18n/navigation";

/**
 * Intent-deferred variant of the app <Link> for large card grids (album / MV).
 * The default <Link> prefetches every card the moment it enters the
 * viewport, so a full grid fires dozens of RSC requests at once — and each
 * re-render that remounts the cards (e.g. the pins store hydrating and
 * reordering the grid) re-fires the whole set. Here prefetch stays off until
 * the user shows intent (hover / focus / touch), then flips to `null` = Next's
 * default static prefetch so the click still lands instantly. This is the
 * pattern Next recommends for long link lists — see
 * node_modules/next/dist/docs/01-app/02-guides/prefetching.md ("Preventing too
 * many prefetches"). Keeps scroll={false} like the base Link (PageScroll owns
 * scroll).
 *
 * Only worth it for grids big enough that prefetch-on-sight is the problem: on
 * touch there is no hover, and onTouchStart arms the prefetch barely 100ms
 * before the click fires, so the first tap still waits out the whole RSC
 * round-trip (measured 199ms vs 22ms on desktop wifi; cellular is far worse).
 * A short list — chrome/nav, the playlist library — takes the plain <Link>.
 */
export function HoverPrefetchLink({
  scroll = false,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: ComponentProps<typeof IntlLink>) {
  const [active, setActive] = useState(false);
  const arm = () => setActive(true);

  return (
    <IntlLink
      scroll={scroll}
      prefetch={active ? null : false}
      onMouseEnter={(e) => {
        arm();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        arm();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        arm();
        onTouchStart?.(e);
      }}
      {...props}
    />
  );
}
