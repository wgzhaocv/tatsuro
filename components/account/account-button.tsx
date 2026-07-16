"use client";

import { CloudArrowUp, CloudCheck, UserCircle } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { GoogleIcon } from "@/components/account/google-icon";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useAccountStore,
  useAccountUser,
  useIsConnected,
  useSyncStatus,
} from "@/lib/account/store";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Account entry in the browse-screen top rail (beside LanguageSwitcher /
 * ThemeToggle). A frosted round icon — cloud-up when disconnected, cloud-check
 * when synced — opening a dialog that either offers Google sign-in (to sync
 * playlists across devices) or shows the connected account + a disconnect. Login
 * is optional and separate from the site gate; disconnecting keeps local data.
 */
export function AccountButton() {
  const t = useTranslations("account");
  const [open, setOpen] = useState(false);
  const connected = useIsConnected();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              aria-label={t("label")}
              className="group relative grid size-11 place-items-center rounded-full border border-white/60 bg-card/80 text-foreground shadow-lift-navy backdrop-blur-xl transition-shadow duration-400 ease-lazy hover:shadow-lift-ocean focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 dark:border-white/15 dark:hover:shadow-lift-coral dark:focus-visible:ring-sky-bright/40"
            >
              {connected ? (
                <CloudCheck size={20} weight="fill" aria-hidden />
              ) : (
                <CloudArrowUp size={20} aria-hidden />
              )}
            </DialogTrigger>
          }
        />
        <TooltipContent sideOffset={8}>
          {connected ? t("labelConnected") : t("label")}
        </TooltipContent>
      </Tooltip>

      <DialogContent className="gap-5">
        {connected ? <ConnectedBody /> : <DisconnectedBody />}
      </DialogContent>
    </Dialog>
  );
}

function DisconnectedBody() {
  const t = useTranslations("account");

  const connect = () => {
    // Hand the Worker where to return us (this page); it 302s back with #token.
    const redirect = encodeURIComponent(window.location.href);
    window.location.href = `${API}/auth/google/login?redirect=${redirect}`;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("connectTitle")}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">{t("connectBody")}</p>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("notNow")}
        </DialogClose>
        <Button type="button" variant="cta" onClick={connect}>
          <GoogleIcon className="size-[18px]" />
          {t("continueWithGoogle")}
        </Button>
      </DialogFooter>
    </>
  );
}

function ConnectedBody() {
  const t = useTranslations("account");
  const user = useAccountUser();
  const status = useSyncStatus();
  const disconnect = useAccountStore((s) => s.clear);

  const statusLabel =
    status === "syncing"
      ? t("syncing")
      : status === "error"
        ? t("syncError")
        : t("synced");

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("connectedTitle")}</DialogTitle>
      </DialogHeader>

      <div className="flex items-center gap-3">
        <UserCircle
          size={40}
          weight="fill"
          aria-hidden
          className="text-ocean-deep dark:text-sky-bright"
        />
        <div className="min-w-0">
          {user?.name && (
            <p className="truncate font-medium text-foreground">{user.name}</p>
          )}
          {user?.email && (
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{statusLabel}</p>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("close")}
        </DialogClose>
        <DialogClose
          render={
            <Button
              type="button"
              variant="ghost"
              onClick={() => disconnect()}
            />
          }
        >
          {t("disconnect")}
        </DialogClose>
      </DialogFooter>
    </>
  );
}
