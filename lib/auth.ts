// Lightweight signed token (JWT-style HMAC-SHA256).
// Runs in both Edge (proxy) and Node (server actions) — Web Crypto only.
// Not a hardened auth scheme; it keeps the raw password out of cookies
// and share links. Ported from the previous site.

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.ARGOT;
  if (!secret) {
    throw new Error("AUTH_SECRET / ARGOT is not configured");
  }
  return secret;
}

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array {
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = str.length % 4 ? 4 - (str.length % 4) : 0;
  str += "=".repeat(pad);
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64url(sig);
}

const DEFAULT_TTL = 60 * 60 * 24 * 30; // 30 days

export async function signToken(
  ttlSeconds: number = DEFAULT_TTL,
): Promise<string> {
  const payload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyToken(token?: string | null): Promise<boolean> {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;

  const expected = await hmac(body);
  // constant-time-ish comparison
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64urlDecode(body)),
    ) as { exp?: number };
    return (
      typeof payload.exp === "number" &&
      payload.exp >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}
