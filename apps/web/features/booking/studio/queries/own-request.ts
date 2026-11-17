import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getViewer } from "../../../shell/queries/get-viewer";
import { loadRequestView, type RequestView } from "./request-view";

/** Eine Anfrage an das eigene Profil, einmal pro Request geladen (Layout und Seite teilen sie). */
export const ownRequest = cache(
  async (id: string, locale: Locale): Promise<RequestView | null> => {
    const viewer = await getViewer();
    if (viewer.kind !== "account" || !viewer.provider) return null;
    return loadRequestView(viewer.userId, id, locale);
  },
);

/** 404 für fremde und unbekannte IDs, vor dem Ladezustand (wie Entscheid 0014). */
export async function requireOwnRequest(
  id: string,
  locale: Locale,
): Promise<RequestView> {
  const request = await ownRequest(id, locale);
  if (!request) notFound();
  return request;
}
