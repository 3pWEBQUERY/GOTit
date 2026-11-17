import { publicFreeSlots } from "@app/core/booking";
import { getDb } from "@app/db";
import { cache } from "react";
import type { ClientSlots } from "../lib/types";

/** Tage, die das Formular anbietet (v2 10.2: die nächsten zwei Wochen). */
export const FORM_DAYS = 14;

/**
 * Freie Zeiten eines Profils für das Formular und für Gegenvorschläge des
 * Mitglieds. Nur, ob eine Zeit frei ist; nie Anfragen, Termine oder Notizen.
 */
export const loadFreeSlots = cache(
  async (profileSlug: string): Promise<ClientSlots | null> => {
    const profile = await getDb().providerProfile.findUnique({
      where: { slug: profileSlug },
      select: { id: true },
    });
    if (!profile) return null;
    const free = await publicFreeSlots(profile.id, new Date(), FORM_DAYS);
    return {
      timeZone: free.timeZone,
      slots: free.slots.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    };
  },
);
