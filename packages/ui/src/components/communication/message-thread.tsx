"use client";

import { Check, CheckCheck, CircleAlert, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";

export type DeliveryStatus = "sending" | "sent" | "read" | "failed";

/** Eine Nachricht im Verlauf. */
export interface ThreadMessage {
  type: "message";
  key: string;
  /** Eigene Nachricht (rechts) oder Nachricht der Gegenseite (links). */
  own: boolean;
  text: ReactNode;
  /** Fertige Zeitangabe, zum Beispiel «14:02». */
  time: string;
  /** Maschinenlesbare Zeit (ISO). */
  dateTime?: string;
  /** Zustellstatus; nur für eigene Nachrichten. */
  status?: DeliveryStatus;
  /** Zeilenmenü der Nachricht, zum Beispiel ein `Menu` mit «Nachricht melden». */
  menu?: ReactNode;
}

/** Trenner zwischen zwei Tagen, zum Beispiel «Heute» oder «Do, 19.11.2026». */
export interface ThreadDateSeparator {
  type: "date";
  key: string;
  label: string;
}

/** Eingebettete Karte, zum Beispiel eine `BookingRequestCard`. */
export interface ThreadCard {
  type: "card";
  key: string;
  /** Richtet die Karte auf der eigenen Seite aus. */
  own?: boolean;
  content: ReactNode;
}

export type ThreadEntry = ThreadMessage | ThreadDateSeparator | ThreadCard;

export interface MessageThreadProps {
  /** Zugänglicher Name des Verlaufs. */
  label: string;
  entries: readonly ThreadEntry[];
  /** Absender für Screenreader vor jeder Nachricht, zum Beispiel «Du» und «Beispielname». */
  authorLabels: { own: string; other: string };
  /** Worte der Zustellstatus: «Wird gesendet», «Gesendet», «Gelesen», «Nicht gesendet». */
  statusLabels: Record<DeliveryStatus, string>;
  /** Beschriftung des Buttons an fehlgeschlagenen Nachrichten, zum Beispiel «Nachricht erneut senden». */
  retryLabel: string;
  onRetry?: (key: string) => void;
  className?: string;
}

const statusIcons = { sending: Clock, sent: Check, read: CheckCheck, failed: CircleAlert } as const;

function Delivery({ status, label }: { status: DeliveryStatus; label: string }) {
  const Icon = statusIcons[status];
  return (
    <span data-status={status} className={cn("inline-flex items-center gap-1", status === "failed" ? "text-error" : "text-ink-muted")}>
      <Icon aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
      {label}
    </span>
  );
}

/**
 * Verlauf einer Unterhaltung (PRD 11.4). Neue Einträge werden als Log höflich
 * vorgelesen. Eigene Nachrichten tragen ihren Zustellstatus als Icon und Wort;
 * fehlgeschlagene bieten «Erneut senden».
 */
export function MessageThread({ label, entries, authorLabels, statusLabels, retryLabel, onRetry, className }: MessageThreadProps) {
  return (
    <div role="log" aria-live="polite" aria-label={label} className={cn("text-ink", className)}>
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => {
          if (entry.type === "date") {
            return (
              <li key={entry.key} className="flex items-center gap-3 py-2">
                <span aria-hidden className="h-px flex-1 bg-border" />
                <span className="tabular text-label text-ink-muted">{entry.label}</span>
                <span aria-hidden className="h-px flex-1 bg-border" />
              </li>
            );
          }
          if (entry.type === "card") {
            return (
              <li key={entry.key} className={cn("flex w-full max-w-panel flex-col", entry.own ? "self-end" : "self-start")}>
                {entry.content}
              </li>
            );
          }
          const failed = entry.own && entry.status === "failed";
          return (
            <li key={entry.key} data-own={entry.own || undefined} className={cn("flex max-w-[85%] flex-col gap-1", entry.own ? "items-end self-end" : "items-start self-start")}>
              <div className={cn("flex items-start gap-1", entry.own && "flex-row-reverse")}>
                <div
                  className={cn(
                    "min-w-0 rounded-card px-4 py-2 text-body whitespace-pre-wrap",
                    entry.own ? "bg-surface-2" : "border border-border bg-surface",
                    failed && "border border-error",
                  )}
                >
                  <span className="sr-only">{entry.own ? authorLabels.own : authorLabels.other}: </span>
                  {entry.text}
                </div>
                {entry.menu}
              </div>
              <p className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-small text-ink-muted">
                <time dateTime={entry.dateTime}>{entry.time}</time>
                {entry.own && entry.status ? <Delivery status={entry.status} label={statusLabels[entry.status]} /> : null}
              </p>
              {failed && onRetry ? (
                <Button variant="quiet" onClick={() => onRetry(entry.key)}>
                  {retryLabel}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
