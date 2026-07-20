"use client";

import { Sparkle } from "@phosphor-icons/react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { nameLang } from "@/lib/api/types";
import { coverUrl } from "@/lib/api/urls";
import {
  mixCover,
  mixSize,
  mixSongs,
  STARTER_MIX_SLUGS,
  type StarterMixSlug,
} from "@/lib/playlists/starter-mixes";
import { usePlaylistStore } from "@/lib/playlists/store";
import { isJapanese } from "@/lib/text";
import { cn } from "@/lib/utils";

/**
 * "Starter mixes": a shortcut that seeds the library with four curated long
 * playlists (see lib/playlists/starter-mixes). Each row imports one mix as a
 * plain user playlist — editable, deletable, and re-importable (a fresh copy
 * each tap). The trigger sits beside "New playlist" on the playlists screen.
 */
export function StarterMixesButton({
  variant = "glass",
  className,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const t = useTranslations("playlists");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Sparkle weight="fill" aria-hidden />
        {t("starterMixes.trigger")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* [&>*]:min-w-0 — the content grid's single auto column otherwise sizes
            to the description's max-content and blows the rows out past the card
            (Import pill clipped off-screen on phones). min-width:0 lets the grid
            children shrink to the capped width so text wraps/truncates. */}
        <DialogContent className="gap-4 [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle>{t("starterMixes.title")}</DialogTitle>
            <DialogDescription>{t("starterMixes.subtitle")}</DialogDescription>
          </DialogHeader>
          <StarterMixesBody onImported={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function StarterMixesBody({ onImported }: { onImported: () => void }) {
  return (
    <ul className="-mx-2 flex flex-col gap-1">
      {STARTER_MIX_SLUGS.map((slug) => (
        <li key={slug}>
          <MixRow slug={slug} onImported={onImported} />
        </li>
      ))}
    </ul>
  );
}

function MixRow({
  slug,
  onImported,
}: {
  slug: StarterMixSlug;
  onImported: () => void;
}) {
  const t = useTranslations("playlists");
  const locale = useLocale();
  const router = useRouter();
  const createPlaylistWithSongs = usePlaylistStore(
    (s) => s.createPlaylistWithSongs,
  );

  // Message keys are camelCase (next-intl splits paths on ".", so a hyphenated
  // segment would break the lookup); the slug itself stays kebab for ids.
  const key = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const name = t(`starterMixes.${key}.name`);
  const blurb = t(`starterMixes.${key}.blurb`);

  async function importMix() {
    const songs = mixSongs(slug, nameLang(locale));
    const id = createPlaylistWithSongs(name, songs);
    onImported();
    // Import here to avoid pulling sonner into the initial playlists chunk.
    const { toast } = await import("sonner");
    toast.success(t("starterMixes.imported", { name }), {
      action: {
        label: t("starterMixes.open"),
        onClick: () => router.push(`/playlists/${id}`),
      },
    });
  }

  return (
    <Button
      type="button"
      variant="row"
      size="row"
      className="w-full"
      onClick={importMix}
    >
      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-secondary">
        <Image
          src={coverUrl(mixCover(slug))}
          alt=""
          fill
          sizes="44px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          lang={isJapanese(name) ? "ja" : undefined}
          className="block truncate text-[15px] text-foreground"
        >
          {name}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {blurb} · {t("songCount", { n: mixSize(slug) })}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-medium text-primary",
        )}
      >
        {t("starterMixes.import")}
      </span>
    </Button>
  );
}
