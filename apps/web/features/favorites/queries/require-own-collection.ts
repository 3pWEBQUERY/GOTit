import { getOwnCollection } from "@app/core/favorites";
import type { Locale } from "@app/core/locale";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireAccount } from "../../account/require-account";

/** Eigene Sammlung oder 404; einmal pro Anfrage für Layout und Seite. Fremde Ids verhalten sich wie unbekannte. */
export const requireOwnCollection = cache(
  async (locale: Locale, collectionId: string) => {
    const viewer = await requireAccount(locale);
    const collection = await getOwnCollection(viewer.userId, collectionId);
    if (!collection) notFound();
    return collection;
  },
);
