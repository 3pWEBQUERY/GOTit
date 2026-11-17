import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getViewerMedia } from "@/features/media/queries/get-own-media";

/**
 * Prüft vor dem Ladezustand, ob das Medium der Person gehört, damit fremde und
 * unbekannte IDs eine echte 404 ergeben und nicht erst nach gestreamtem Laden.
 */
export default async function MediaDetailLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const media = await getViewerMedia((await params).id);
  if (!media || media.status === "FAILED") notFound();
  return children;
}
