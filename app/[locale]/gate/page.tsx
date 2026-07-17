import { getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeImage } from "@/components/theme-image";
import { ThemeToggle } from "@/components/theme-toggle";
import { socialMeta } from "@/lib/site";
import beach from "./_assets/beach.jpg";
import beachDusk from "./_assets/beach-dusk.jpg";
import { GateForm } from "./gate-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  // og:image is the sibling opengraph-image.tsx (the dusk "locked" card).
  return socialMeta(t("gateTitle"), t("gateDescription"));
}

export default function GatePage() {
  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <ThemeToggle className="absolute top-5 right-5 z-10" />
      {/* environment layer: real photo per theme + pale navy scrim (Light Overlay Rule) */}
      <div aria-hidden="true" className="absolute inset-0">
        {/* Noon — aerial turquoise sea, white sand, a single palm (carries the
            wordmark raw). Dusk — twilight palm with its own sunset sky. One
            photo renders at a time (ThemeImage); scrims stay CSS-swapped. */}
        <ThemeImage
          noon={beach}
          dusk={beachDusk}
          sizes="100vw"
          className="object-[50%_30%] dark:object-[50%_42%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(11,58,83,0.14),rgba(11,58,83,0)_40%,rgba(11,58,83,0.10)_72%,rgba(11,58,83,0.32))] dark:bg-[linear-gradient(to_bottom,rgba(18,38,58,0.42),rgba(18,38,58,0.08)_28%,rgba(18,38,58,0.12)_66%,rgba(18,38,58,0.62))]" />
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
          <h1 className="mt-2 font-brand font-medium text-[clamp(2.75rem,5vw,3.75rem)] text-white leading-[1.08] tracking-[0.06em] [text-shadow:0_2px_10px_rgba(11,58,83,0.45),0_6px_30px_rgba(11,58,83,0.5)]">
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
