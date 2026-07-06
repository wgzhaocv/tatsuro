import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Global search affordance for the home hero — glass input with a leading icon. */
export function HomeSearch({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <MagnifyingGlassIcon
        aria-hidden
        weight="bold"
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-white [filter:drop-shadow(0_1px_3px_rgba(11,58,83,0.65))]"
      />
      <Input
        variant="glass"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        className="h-11 w-full pl-10 pr-4"
      />
    </div>
  );
}
