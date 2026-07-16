"use client";

// The catalog search index — fetched once (staleTime:Infinity via QueryProvider,
// the discography is fixed), then filtered in memory. The browser HTTP cache
// (immutable) covers reloads across sessions; this query dedupes within one.

import { useQuery } from "@tanstack/react-query";
import { fetchSearchIndex } from "@/lib/api/search";
import type { SearchIndex } from "@/lib/api/types";

export const searchIndexKey = ["search-index"] as const;

export function useSearchIndex() {
  return useQuery<SearchIndex>({
    queryKey: searchIndexKey,
    queryFn: fetchSearchIndex,
  });
}
