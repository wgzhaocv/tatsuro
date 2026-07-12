import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Themed 404 for unknown releases/editions. Renders inside the album layout
 * (back pill + theme toggle) on the base sea-sky gradient; plain, functional
 * copy — the full empty-state pass is roadmap #9.
 */
export default function AlbumNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24 text-center">
      <h1 className="font-display text-3xl font-medium text-foreground">
        Album not found
      </h1>
      <p className="max-w-sm text-muted-foreground">
        This record isn&apos;t in the collection.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "default" }), "mt-2 h-11 px-6")}
      >
        Back to Albums
      </Link>
    </div>
  );
}
