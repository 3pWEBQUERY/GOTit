"use client";

import { MediaError } from "@/features/media/components/media-error";

export default function MediaErrorPage({ reset }: { error: Error; reset: () => void }) {
  return <MediaError reset={reset} />;
}
