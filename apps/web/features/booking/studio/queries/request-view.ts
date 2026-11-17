import {
  DURATIONS,
  OPEN_STATUSES,
  getRequestDetail,
  type BookingAction,
  type BookingStatus,
} from "@app/core/booking";
import type { Locale } from "@app/core/locale";
import { getTranslations } from "next-intl/server";
import { localStamp } from "../lib/calendar-model";
import { durationParts, formatMoment, formatSpan } from "../lib/format";

/** Eine Terminanfrage, fertig für das Studio: Texte formatiert, Zeiten in der Zone des Anbieters. */
export interface RequestView {
  id: string;
  conversationId: string;
  status: BookingStatus;
  memberName: string;
  when: string;
  duration: string;
  /** Nur bei offenen Anfragen: bis wann eine Antwort möglich ist. */
  expires: string | null;
  message: string | null;
  regionName: string | null;
  providerNote: string | null;
  actions: BookingAction[];
  events: RequestEventView[];
  timeZone: string;
  /** Vorbelegung des Gegenvorschlags: Tag, Uhrzeit und Dauer des aktuellen Vorschlags. */
  counter: { day: string; time: string; duration: number };
  /** Wer den aktuellen Vorschlag gemacht hat. */
  proposedByMe: boolean;
}

export interface RequestEventView {
  id: string;
  status: BookingStatus;
  title: string;
  time: string;
  dateTime: string;
  actor: string;
  note: string | null;
}

/** Dauer als «1 Std. 30 Min.». */
export async function durationText(
  locale: Locale,
  start: Date,
  end: Date,
): Promise<string> {
  const t = await getTranslations({
    locale,
    namespace: "bookingStudio.duration",
  });
  const { hours, minutes } = durationParts(start, end);
  return [
    hours > 0 ? t("hours", { count: hours }) : "",
    minutes > 0 ? t("minutes", { count: minutes }) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Detail für `/studio/anfragen/[id]` und das Seitenpanel im Kalender. Nur die
 * Anbieterseite der Unterhaltung erhält es; für alle anderen ist die Anfrage
 * unbekannt (404, Entscheid 0016 «Wer etwas sieht»).
 */
export async function loadRequestView(
  userId: string,
  requestId: string,
  locale: Locale,
  now = new Date(),
): Promise<RequestView | null> {
  const detail = await getRequestDetail(userId, requestId, locale, now);
  if (!detail || detail.role !== "PROVIDER") return null;
  const t = await getTranslations({ locale, namespace: "bookingStudio" });
  const zone = detail.timeZone;
  const span = (start: Date, end: Date) => formatSpan(start, end, locale, zone);
  const stamp = localStamp(detail.startsAt, zone);
  const minutes = Math.round(
    (detail.endsAt.getTime() - detail.startsAt.getTime()) / 60_000,
  );
  const events = [...detail.events].reverse().map((event): RequestEventView => {
    const notes = [
      event.action === "counter" && event.startsAt && event.endsAt
        ? t("history.proposal", { when: span(event.startsAt, event.endsAt) })
        : "",
      event.action === "cancel-safety" ? t("history.safety") : "",
      event.reason ? t("history.reason", { reason: event.reason }) : "",
    ].filter(Boolean);
    return {
      id: event.id,
      status: event.toStatus,
      title: historyAction(event.action)
        ? t(`history.action.${historyAction(event.action)}`)
        : t(`status.${event.toStatus}`),
      time: formatMoment(event.createdAt, locale, zone),
      dateTime: event.createdAt.toISOString(),
      actor: t(`roles.${event.actorRole ?? "SYSTEM"}`),
      note: notes.length > 0 ? notes.join(" ") : null,
    };
  });
  return {
    id: detail.id,
    conversationId: detail.conversationId,
    status: detail.status,
    memberName: detail.counterpartName ?? t("memberFallback"),
    when: span(detail.startsAt, detail.endsAt),
    duration: await durationText(locale, detail.startsAt, detail.endsAt),
    expires: OPEN_STATUSES.includes(detail.status)
      ? formatMoment(
          new Date(
            Math.min(detail.expiresAt.getTime(), detail.startsAt.getTime()),
          ),
          locale,
          zone,
        )
      : null,
    message: detail.message,
    regionName: detail.regionName,
    providerNote: detail.providerNote,
    actions: detail.actions,
    events,
    timeZone: zone,
    counter: {
      day: stamp.slice(0, 10),
      time: stamp.slice(11, 16),
      duration: (DURATIONS as readonly number[]).includes(minutes)
        ? minutes
        : 60,
    },
    proposedByMe: detail.lastProposedBy === "PROVIDER",
  };
}

const HISTORY_ACTIONS: Record<string, string> = {
  created: "created",
  accept: "accept",
  counter: "counter",
  decline: "decline",
  cancel: "cancel",
  "cancel-safety": "cancelSafety",
  complete: "complete",
  dispute: "dispute",
  expired: "expire",
};

/** Bekannte Aktionen haben ein eigenes Wort; alles andere heisst nach dem neuen Status. */
function historyAction(action: string): string | null {
  return HISTORY_ACTIONS[action] ?? null;
}
