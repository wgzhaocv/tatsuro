"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * TanStack Query for client-side data (player queue enrichment, song details).
 * The catalog is a fixed discography, so queries default to never going stale —
 * the same assumption the server layer makes with cacheLife('max').
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Number.POSITIVE_INFINITY,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
