"use client";

import { CircleNotch, LinkBreak, ShareNetwork } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/account/google-icon";
import { useShareLink } from "@/components/share/use-share";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { useIsConnected } from "@/lib/account/store";
import {
  createPlaylistShareLink,
  revokePlaylistShare,
} from "@/lib/playlists/share";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Share entry for the playlist header, beside the offline switch. Shown whether or
 * not an account is connected, so the feature stays discoverable: connected users
 * get the share menu, everyone else a gentle sign-in prompt.
 *
 * A menu rather than a plain button because revoking needs a home too, and keeping
 * both actions here means the screen never has to pre-read whether the playlist is
 * currently shared (there is no status endpoint by design). The trade-off is that
 * "stop sharing" shows for an unshared playlist as well — pressing it is a
 * harmless no-op.
 */
export function SharePlaylistMenu({
  playlistId,
  title,
}: {
  playlistId: string;
  /** Localized display name — the native share sheet's title. */
  title: string;
}) {
  const connected = useIsConnected();
  return connected ? (
    <ShareMenu playlistId={playlistId} title={title} />
  ) : (
    <ShareLoginButton />
  );
}

/** The frosted round entry point. One spec for both branches — from the user's
 *  side it's the same button, and only what it opens differs. */
function shareTriggerProps(label: string) {
  return {
    type: "button",
    variant: "glass-ink",
    size: "icon",
    className: "size-11 rounded-full",
    "aria-label": label,
    title: label,
  } as const;
}

function ShareMenu({
  playlistId,
  title,
}: {
  playlistId: string;
  title: string;
}) {
  const t = useTranslations("share");
  const [open, setOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const { share, pending } = useShareLink();

  const onShare = async () => {
    if (await share(() => createPlaylistShareLink(playlistId), title))
      setOpen(false);
  };

  const onRevoke = async () => {
    setRevoking(true);
    const ok = await revokePlaylistShare(playlistId);
    setRevoking(false);
    if (ok) {
      toast.success(t("stopped"));
      setOpen(false);
    } else {
      // Not `failed` — that one says "couldn't create a link", which reads as
      // nonsense after pressing Stop sharing.
      toast.error(t("stopFailed"));
    }
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger render={<Button {...shareTriggerProps(t("playlist"))} />}>
        <ShareNetwork weight="bold" aria-hidden />
      </MenuTrigger>
      <MenuContent>
        {/* Each action disables the other while it runs. Both stay clickable
            otherwise, but overlapping them inverts the outcome: a Stop pressed
            during a pending Share revokes nothing (there's no live slug yet),
            then the Share lands — leaving a live link behind a "sharing
            stopped" toast. */}
        <MenuItem
          closeOnClick={false}
          disabled={pending || revoking}
          onClick={onShare}
        >
          {pending ? (
            <CircleNotch className="animate-spin" aria-hidden />
          ) : (
            <ShareNetwork aria-hidden />
          )}
          {t("playlist")}
        </MenuItem>
        <MenuItem
          variant="destructive"
          closeOnClick={false}
          disabled={revoking || pending}
          onClick={onRevoke}
        >
          {revoking ? (
            <CircleNotch className="animate-spin" aria-hidden />
          ) : (
            <LinkBreak weight="bold" aria-hidden />
          )}
          {t("stopSharing")}
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** Not connected: explain that a share link is served from the synced copy, and
 *  offer the same Google sign-in the account dialog uses. */
function ShareLoginButton() {
  const t = useTranslations("share");
  const ta = useTranslations("account");

  const connect = () => {
    // Hand the Worker where to return us (this page); it 302s back with #token.
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${API}/auth/google/login?redirect=${redirect}`;
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button {...shareTriggerProps(t("playlist"))} />}>
        <ShareNetwork weight="bold" aria-hidden />
      </DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>{t("loginTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("loginBody")}</p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            {ta("notNow")}
          </DialogClose>
          <Button type="button" variant="cta" onClick={connect}>
            <GoogleIcon className="size-[18px]" />
            {ta("continueWithGoogle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
