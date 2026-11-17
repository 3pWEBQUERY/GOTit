import type { Viewer } from "@app/core/identity";
import { headers } from "next/headers";
import { isAgeConfirmed } from "../../age-gate/queries/is-age-confirmed";
import { isPrefetch, visitorKey } from "./visitor-key";

/**
 * Zählt diese Anfrage als Ansicht (Entscheid 0019)? Nicht bei Prefetch und
 * nicht vor der Altersprüfung: Das Layout leitet dann um, die Seite rendert
 * aber parallel mit. Gibt die Kennung des Besuchers zurück oder `null`.
 */
export async function countableVisitor(viewer: Viewer): Promise<string | null> {
  const list = await headers();
  if (isPrefetch(list) || !(await isAgeConfirmed(viewer))) return null;
  return visitorKey(viewer, list);
}
