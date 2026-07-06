"use client";

import { ArrowRight, CircleNotch, LockSimple } from "@phosphor-icons/react";
import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type GateState, verifyArgot } from "./actions";
import { useRateLimit } from "./use-rate-limit";

export function GateForm() {
  const [state, formAction, pending] = useActionState<GateState, FormData>(
    verifyArgot,
    null,
  );
  const { rateLimited, cooldownTime, checkRateLimit, recordAttempt } =
    useRateLimit();

  // each failed round-trip returns a fresh state object, so this fires per attempt
  useEffect(() => {
    if (state?.error) recordAttempt();
  }, [state, recordAttempt]);

  const showError = Boolean(state?.error) && !pending && !rateLimited;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (checkRateLimit()) event.preventDefault();
      }}
      className="w-full"
    >
      {/* frosted glass pedestal over the photo (Glass Discipline) */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/60 bg-card/85 p-2 pl-5 shadow-lift-navy backdrop-blur-xl transition-all duration-400 ease-lazy dark:border-white/15",
          "focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/35 dark:focus-within:border-sky-bright dark:focus-within:ring-sky-bright/35",
          showError && "border-coral-ink/50 dark:border-coral/50",
        )}
      >
        <LockSimple
          aria-hidden="true"
          size={18}
          className="shrink-0 text-muted-foreground"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          aria-invalid={showError || undefined}
          disabled={pending}
          className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={pending || rateLimited}
          className="h-11 rounded-full bg-coral-ink px-6 text-white hover:bg-coral-ink/90 hover:shadow-lift-coral"
        >
          Enter
          {pending ? (
            <CircleNotch aria-hidden="true" className="animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
        </Button>
      </div>

      {/* feedback slot — fixed height so the postcard never jumps */}
      <div aria-live="polite" className="mt-4 flex min-h-9 justify-center">
        {rateLimited ? (
          <p className="rounded-full bg-card/85 px-4 py-1.5 text-sm text-coral-ink backdrop-blur-xl dark:text-coral">
            Too many attempts. Try again in {cooldownTime}s.
          </p>
        ) : showError ? (
          <p className="animate-in rounded-full bg-card/85 px-4 py-1.5 text-sm text-coral-ink backdrop-blur-xl duration-400 fade-in dark:text-coral">
            Wrong password. Try again.
          </p>
        ) : null}
      </div>
    </form>
  );
}
