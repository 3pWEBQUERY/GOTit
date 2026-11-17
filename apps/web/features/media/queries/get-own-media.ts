import { getOwnMedia } from "@app/core/media";
import { cache } from "react";
import { getViewer } from "../../shell/queries/get-viewer";

/** Eigenes Medium der angemeldeten Person, einmal pro Anfrage geladen (Layout und Seite teilen es). */
export const getViewerMedia = cache(async (id: string) => {
  const viewer = await getViewer();
  return viewer.kind === "account" ? getOwnMedia(viewer.userId, id) : null;
});
