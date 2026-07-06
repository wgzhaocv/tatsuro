"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signToken } from "@/lib/auth";
import { AUTH_COOKIE_NAME, REDIRECT_URL_COOKIE } from "@/lib/constants";

export type GateState = { error: "wrong-password" } | null;

function resolvePath(saved: string | undefined): string {
  if (!saved) return "/";
  try {
    const url = new URL(saved);
    // reject the gate itself and dot-paths (e.g. /.well-known devtools probes)
    if (url.pathname === "/gate" || url.pathname.startsWith("/.")) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

export async function verifyArgot(
  _prev: GateState,
  formData: FormData,
): Promise<GateState> {
  const argot = formData.get("password");
  const expected = process.env.ARGOT;
  if (typeof argot !== "string" || !expected || argot !== expected) {
    return { error: "wrong-password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, await signToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const saved = cookieStore.get(REDIRECT_URL_COOKIE)?.value;
  cookieStore.delete(REDIRECT_URL_COOKIE);
  redirect(resolvePath(saved));
}
