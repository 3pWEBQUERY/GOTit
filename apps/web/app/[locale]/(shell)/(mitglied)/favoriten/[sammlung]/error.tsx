"use client";

import { FavoritesError } from "@/features/favorites/components/favorites-states";

export default function FavoritesErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <FavoritesError area="page" reset={reset} />;
}
