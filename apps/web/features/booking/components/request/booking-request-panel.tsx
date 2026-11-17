import { loadFreeSlots } from "../../queries/load-slots";
import { parseDraft } from "../../lib/draft";
import { slotDays } from "../../lib/slot-options";
import { RequestPanel, type RequestPanelState } from "./request-panel";

export interface BookingRequestPanelProps {
  slug: string;
  name: string;
  /** Nimmt das Profil gerade Terminanfragen an (freigeschaltet, nicht pausiert oder eingeschränkt)? */
  accepts: boolean;
  /** Nimmt es Nachrichten an? Dann ist «Nachricht schreiben» der Ausweg ohne freie Zeiten. */
  acceptsMessages: boolean;
  regions: readonly { id: string; name: string }[];
  signedIn: boolean;
  /** Besucher: Anmeldung mit Rückkehr zum Profil, für «Nachricht schreiben». */
  signInHref: string | null;
  search: Record<string, string | string[] | undefined>;
  closeHref: string;
}

/**
 * Lädt die freien Zeiten der nächsten zwei Wochen und öffnet das Panel
 * (v2 10.2). Ohne eingetragene Fenster sagt es das ehrlich und bietet
 * «Nachricht schreiben» an (Entscheid 0016).
 */
export async function BookingRequestPanel({
  slug,
  name,
  accepts,
  acceptsMessages,
  regions,
  signedIn,
  signInHref,
  search,
  closeHref,
}: BookingRequestPanelProps) {
  const slots = accepts ? await loadFreeSlots(slug) : null;
  const state: RequestPanelState =
    !accepts || !slots
      ? "closed"
      : slotDays(slots.slots, slots.timeZone).length === 0
        ? "no-slots"
        : "ready";
  return (
    <RequestPanel
      slug={slug}
      name={name}
      state={state}
      slots={slots ?? { timeZone: "Europe/Zurich", slots: [] }}
      regions={regions}
      initial={parseDraft(search)}
      signedIn={signedIn}
      message={acceptsMessages ? { signInHref } : null}
      closeHref={closeHref}
    />
  );
}
