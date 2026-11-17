"use client";

import { SearchError } from "@/features/search/components/search-status";

export default function SearchErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <SearchError reset={reset} />;
}
