"use client";

import { Plus } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { usePlaylistStore } from "@/lib/playlists/store";
import { PlaylistNameDialog } from "./name-dialog";

/** "New playlist" trigger + the name dialog; on create it opens the new list. */
export function CreatePlaylistButton({
  variant = "cta",
  className,
}: {
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const t = useTranslations("playlists");
  const [open, setOpen] = useState(false);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus weight="bold" aria-hidden />
        {t("newPlaylist")}
      </Button>
      <PlaylistNameDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        onSubmit={(name) => router.push(`/playlists/${createPlaylist(name)}`)}
      />
    </>
  );
}
