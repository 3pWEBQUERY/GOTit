import { DURATIONS, MESSAGE_MAX } from "@app/core/booking/schemas";

/**
 * Begonnene Terminanfrage über die Anmeldung hinweg (v2 8.2, 10.1): Tag,
 * Uhrzeit, Dauer und Region stehen in `?weiter=` als URL-Parameter, die
 * Nachricht nie in der URL, sondern nur im Sitzungsspeicher des Browsers.
 * Ohne Speicher (privates Fenster, blockiert) geht nur die Nachricht verloren.
 */
export interface RequestDraft {
  day: string | null;
  time: string | null;
  duration: number | null;
  regionId: string | null;
}

export const EMPTY_DRAFT: RequestDraft = {
  day: null,
  time: null,
  duration: null,
  regionId: null,
};

export const DRAFT_PARAMS = {
  day: "tag",
  time: "zeit",
  duration: "dauer",
  regionId: "region",
} as const;

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | null {
  const text = typeof value === "string" ? value : value?.[0];
  return text && text.length <= 64 ? text : null;
}

export function parseDraft(search: Search): RequestDraft {
  const day = single(search[DRAFT_PARAMS.day]);
  const time = single(search[DRAFT_PARAMS.time]);
  const duration = Number(single(search[DRAFT_PARAMS.duration]));
  const regionId = single(search[DRAFT_PARAMS.regionId]);
  return {
    day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
    time: time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
    duration: (DURATIONS as readonly number[]).includes(duration)
      ? duration
      : null,
    regionId: regionId && /^[\w-]+$/.test(regionId) ? regionId : null,
  };
}

/** Nur gesetzte Werte, für die URL nach der Anmeldung. */
export function draftQuery(draft: RequestDraft): Record<string, string> {
  const query: Record<string, string> = {};
  if (draft.day) query[DRAFT_PARAMS.day] = draft.day;
  if (draft.time) query[DRAFT_PARAMS.time] = draft.time;
  if (draft.duration) query[DRAFT_PARAMS.duration] = String(draft.duration);
  if (draft.regionId) query[DRAFT_PARAMS.regionId] = draft.regionId;
  return query;
}

function storageKey(slug: string): string {
  return `booking-request:${slug}`;
}

export function storeMessage(slug: string, message: string): void {
  try {
    if (message.trim())
      window.sessionStorage.setItem(
        storageKey(slug),
        message.slice(0, MESSAGE_MAX),
      );
    else window.sessionStorage.removeItem(storageKey(slug));
  } catch {
    // Ohne Speicher bleibt die Nachricht nur bis zum Seitenwechsel erhalten.
  }
}

export function readMessage(slug: string): string | null {
  try {
    return window.sessionStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
}

export function clearMessage(slug: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(slug));
  } catch {
    // nichts zu tun
  }
}
