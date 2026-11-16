import { getSessionUserId } from "@app/auth";
import { VISITOR, loadAccountViewer, type Viewer } from "@app/core/identity";
import { headers } from "next/headers";
import { cache } from "react";

/** Wer die Anfrage stellt. Einmal pro Anfrage geladen, von Layouts und Aktionen geteilt. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const userId = await getSessionUserId(await headers());
  if (!userId) return VISITOR;
  return (await loadAccountViewer(userId)) ?? VISITOR;
});
