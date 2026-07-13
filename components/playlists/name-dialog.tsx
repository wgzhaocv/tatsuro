"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useVisiblePlaylists } from "@/lib/playlists/store";

export const MAX_NAME = 50;

/**
 * The shared name form behind Create and Rename — one text field, live
 * validation (non-empty, ≤50, no duplicate name), and a quiet submit. No fake
 * delay or success theatre: it commits and closes. Controlled by the caller so
 * it can live inside a menu or a header action.
 */
export function PlaylistNameDialog({
  open,
  onOpenChange,
  mode,
  initialName = "",
  excludeId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "rename";
  initialName?: string;
  /** Rename: the playlist being renamed, excluded from the duplicate check. */
  excludeId?: string;
  onSubmit: (name: string) => void;
}) {
  const t = useTranslations("playlists");
  const playlists = useVisiblePlaylists();
  const fieldId = useId();
  const [name, setName] = useState(initialName);

  const trimmed = name.trim();
  const duplicate = playlists.some(
    (p) =>
      p.id !== excludeId &&
      p.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  const valid = trimmed.length > 0 && trimmed.length <= MAX_NAME && !duplicate;

  function submit() {
    if (!valid) return;
    onSubmit(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Reset to the starting value whenever the dialog (re)opens.
        if (v) setName(initialName);
        onOpenChange(v);
      }}
    >
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createTitle") : t("renameTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-2"
        >
          <Input
            id={fieldId}
            autoFocus
            value={name}
            maxLength={MAX_NAME}
            placeholder={t("namePlaceholder")}
            aria-invalid={duplicate || undefined}
            aria-describedby={duplicate ? `${fieldId}-err` : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {duplicate && (
            <p
              id={`${fieldId}-err`}
              className="px-1 text-[13px] text-destructive"
            >
              {t("nameTaken")}
            </p>
          )}

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            <Button type="submit" variant="cta" disabled={!valid}>
              {mode === "create" ? t("create") : t("rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
