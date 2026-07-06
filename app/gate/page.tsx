import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import beach from "./_assets/beach.jpg";
import beachDusk from "./_assets/beach-dusk.jpg";
import { GateForm } from "./gate-form";

export default function GatePage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <ThemeToggle className="absolute top-5 right-5 z-10" />
      {/* environment layer: real photo per theme + pale navy scrim (Light Overlay Rule) */}
      <div aria-hidden="true" className="absolute inset-0">
        {/* Noon — aerial turquoise sea, white sand, a single palm. Already in the
            ocean family, so it carries the wordmark raw (no colour grade). */}
        <div className="absolute inset-0 dark:hidden">
          <Image
            src={beach}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-[50%_30%]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,58,83,0.14),rgba(11,58,83,0)_40%,rgba(11,58,83,0.10)_72%,rgba(11,58,83,0.32))]" />
        </div>
        {/* Dusk — twilight palm, its own violet→coral→blue sky (a cinematic sunset scrim) */}
        <div className="absolute inset-0 hidden dark:block">
          <Image
            src={beachDusk}
            alt=""
            fill
            placeholder="blur"
            sizes="100vw"
            className="object-cover object-[50%_42%]"
          />
          {/* gentle navy veils top and bottom; the sky reads through the middle */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,38,58,0.42),rgba(18,38,58,0.08)_28%,rgba(18,38,58,0.12)_66%,rgba(18,38,58,0.62))]" />
        </div>
        {/* soft pool of shade behind the wordmark so white type never sits on bare glare/glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_56%_22%_at_50%_44%,rgba(11,58,83,0.28),transparent_72%)] dark:bg-[radial-gradient(ellipse_60%_24%_at_50%_44%,rgba(18,38,58,0.42),transparent_74%)]" />
      </div>

      <div className="relative flex w-full flex-col items-center">
        <header className="text-center">
          <p
            lang="ja"
            className="indent-[0.4em] font-medium text-lg text-white tracking-[0.4em] [text-shadow:0_2px_16px_rgba(11,58,83,0.5)]"
          >
            山下達郎
          </p>
          <h1 className="mt-2 font-semibold text-[clamp(2.75rem,5vw,3.75rem)] text-white leading-[1.08] tracking-[0.01em] [text-shadow:0_2px_10px_rgba(11,58,83,0.45),0_6px_30px_rgba(11,58,83,0.5)]">
            TATSURO YAMASHITA
          </h1>
        </header>
        <div className="mt-12 w-full max-w-md">
          <GateForm />
        </div>
      </div>
    </main>
  );
}
