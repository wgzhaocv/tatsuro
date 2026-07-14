"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Spotlight-style search entry: a round glass icon in the nav that opens a
 * command palette (⌘K from anywhere). This is only the shell — results and the
 * actual search wiring land later behind a dedicated API. Keep it
 * self-contained; don't thread page data through here.
 */
export function CommandSearch() {
  const tn = useTranslations("nav");
  const ts = useTranslations("search");
  const [open, setOpen] = useState(false);

  // ⌘K / Ctrl-K toggles the palette from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="glass"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={tn("search")}
        className="size-11 rounded-full"
      >
        <MagnifyingGlassIcon weight="bold" className="size-[18px]" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[16vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">{ts("title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {ts("description")}
          </DialogDescription>
          <Command className="bg-transparent">
            <CommandInput placeholder={ts("placeholder")} />
            <CommandList>
              <CommandEmpty>{ts("empty")}</CommandEmpty>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
