"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

function makeClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

/**
 * The client-side QueryClient. On the server it's per-render (never shared
 * across requests); in the browser it's a singleton so non-React callers — the
 * cloud-sync module hydrating pulled songs (lib/account/sync.ts) — share the
 * same song cache useSong reads. Standard Next + TanStack pattern.
 */
export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeClient();
  if (!browserClient) browserClient = makeClient();
  return browserClient;
}

/**
 * TanStack Query for client-side data (player queue enrichment, song details).
 * The catalog is a fixed discography, so queries default to never going stale —
 * the same assumption the server layer makes with cacheLife('max').
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
