import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A cover image for the album screen, player, and ambient wash. It used to
 * dissolve in with an opacity transition — removed: on these mostly-static
 * surfaces the fade read as gratuitous, and starting at opacity-0 held back the
 * LCP paint. With no load state left it's a plain, server-renderable <Image>.
 * (Name kept to avoid churn across its callers; it no longer fades.)
 */
export function FadeImage({
  src,
  sizes,
  priority,
  eager,
  className,
}: {
  src: string;
  sizes: string;
  /** Above-the-fold LCP candidate: load eager with fetchpriority=high. Next 16
   *  deprecated the `priority` prop, so we hint the <img> directly. */
  priority?: boolean;
  /** Load eagerly without the high-priority hint — large above-the-fold
   *  decoration (the ambient wash). */
  eager?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      fill
      loading={priority || eager ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
