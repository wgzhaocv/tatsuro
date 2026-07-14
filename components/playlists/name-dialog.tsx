"use client";

import { useTranslations } from "next-intl";
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
 * Read the trimmed name out of a submitted playlist form. Shared by every
 * create/rename path so the rules can't disagree: non-empty after trim,
 * ≤MAX_NAME (the input's maxLength), no duplicate name. Invalid input is
 * surfaced through the native validity bubble and yields null. The name field
 * must be `name="name"` and clear its customValidity onInput, or a rejected
 * duplicate would block the form's next submit.
 */
export function submittedPlaylistName(
  form: HTMLFormElement,
  playlists: { id: string; name: string }[],
  takenMessage: string,
  excludeId?: string,
): string | null {
  const input = form.elements.namedItem("name") as HTMLInputElement;
  const name = input.value.trim();
  const taken = playlists.some(
    (p) =>
      p.id !== excludeId && p.name.trim().toLowerCase() === name.toLowerCase(),
  );
  if (!name || taken) {
    if (!name) input.value = ""; // whitespace-only → let `required` speak
    input.setCustomValidity(taken ? takenMessage : "");
    input.reportValidity();
    return null;
  }
  return name;
}

/**
 * The shared name form behind Create and Rename — one uncontrolled text field
 * validated on submit (native validity bubble), and a quiet commit-and-close.
 * The popup unmounts when closed, so defaultValue starts fresh every open.
 * Controlled by the caller so it can live inside a menu or a header action.
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createTitle") : t("renameTitle")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = submittedPlaylistName(
              e.currentTarget,
              playlists,
              t("nameTaken"),
              excludeId,
            );
            if (name === null) return;
            onSubmit(name);
            onOpenChange(false);
          }}
          className="flex flex-col gap-2"
        >
          <Input
            // Rename commits change initialName while the popup is still
            // animating out — remount so the uncontrolled field never sees a
            // defaultValue change (base-ui warns otherwise).
            key={initialName}
            name="name"
            autoFocus
            required
            defaultValue={initialName}
            maxLength={MAX_NAME}
            placeholder={t("namePlaceholder")}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
          />

          <DialogFooter className="mt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t("cancel")}
            </DialogClose>
            <Button type="submit" variant="cta">
              {mode === "create" ? t("create") : t("rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
