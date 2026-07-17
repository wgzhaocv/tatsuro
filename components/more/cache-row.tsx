import type { ReactNode } from "react";

/**
 * One row in the offline-storage panel — an optional leading icon, a title with
 * a tabular-nums detail line, and an optional trailing control. Shared by the
 * per-bucket breakdown, the saved-sources list, and the cached-albums list so
 * the three stay identical in shape.
 */
export function CacheRow({
  leading,
  title,
  detail,
  trailing,
}: {
  leading?: ReactNode;
  title: ReactNode;
  detail: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        {leading && (
          <span className="text-muted-foreground [&_svg]:size-[1.05rem]">
            {leading}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] text-foreground leading-tight">
            {title}
          </p>
          <p className="text-muted-foreground text-sm tabular-nums">{detail}</p>
        </div>
      </div>
      {trailing}
    </div>
  );
}
