"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { glassSurface } from "@/components/glass-panel";
import { cn } from "@/lib/utils";

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

/** The frosted popup, anchored to the trigger. Mirrors the select popup's
 *  glass + lift so overflow menus match the rest of the chrome. */
function MenuContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            "min-w-44 origin-(--transform-origin) rounded-lg p-1 text-foreground shadow-lift-navy duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            glassSurface,
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/** A menu row. `variant="destructive"` tints it for irreversible actions
 *  (delete); the highlight follows base-ui's keyboard/pointer `data-highlighted`. */
function MenuItem({
  className,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & { variant?: "default" | "destructive" }) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-variant={variant}
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-md px-3 py-2 text-sm outline-none transition-colors select-none data-highlighted:bg-foreground/10 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
        className,
      )}
      {...props}
    />
  );
}

export { Menu, MenuContent, MenuItem, MenuTrigger };
