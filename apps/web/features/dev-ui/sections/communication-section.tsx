"use client";

import { BookingRequestCard, ChatLabel, ConversationList, EmptyState, type Conversation } from "@app/ui";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import { CommunicationReportDemo } from "./communication-report-demo";
import { CommunicationThreadDemo } from "./communication-thread-demo";

const conversations: Conversation[] = [
  {
    key: "1",
    href: "#unterhaltung-eins",
    name: "Beispielname Eins",
    time: "14:02",
    preview: "Beispieltext einer Nachricht, der länger ist als eine Zeile und deshalb am Ende gekürzt wird",
    unreadLabel: "2 ungelesene Nachrichten",
    labels: [{ key: "open", label: "Termin offen" }],
  },
  { key: "2", href: "#unterhaltung-zwei", name: "Beispielname Zwei", time: "Gestern", preview: "Beispieltext einer Antwort", current: true },
  {
    key: "3",
    href: "#unterhaltung-drei",
    name: "Beispielname Drei",
    time: "12.11.",
    preview: "Beispieltext einer älteren Nachricht",
    labels: [
      { key: "confirmed", label: "Bestätigt" },
      { key: "feedback", label: "Rückmeldung nötig" },
    ],
  },
];

const bookingDetails = [
  { key: "date", label: "Datum", value: "Do, 19.11.2026" },
  { key: "time", label: "Uhrzeit", value: "18:00" },
  { key: "duration", label: "Dauer", value: "1 Std." },
  { key: "region", label: "Region", value: "Beispielstadt" },
];

const bookingLabels = { accept: "Anfrage zusagen", counter: "Gegenvorschlag senden", decline: "Anfrage ablehnen" };

/** Testseite der Gruppe «Kommunikation»: jede Komponente in allen Zuständen. */
export function CommunicationSection() {
  const [labels, setLabels] = useState(["Neue Anfrage", "Termin offen"]);
  const [lastAction, setLastAction] = useState("Noch keine Aktion gewählt");

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ConversationList</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Bereit: ungelesen, aktuell, mit Labels</h3>
          <ConversationList className="max-w-panel rounded-card border border-border" label="Beispielunterhaltungen" conversations={conversations} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Lädt</h3>
          <ConversationList className="max-w-panel" label="Beispielunterhaltungen" conversations={[]} loading loadingLabel="Unterhaltungen werden geladen" skeletonRows={3} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Leer</h3>
          <ConversationList
            className="max-w-panel"
            label="Beispielunterhaltungen"
            conversations={[]}
            empty={
              <EmptyState
                icon={<MessagesSquare strokeWidth={1.5} />}
                title="Hier stehen deine Unterhaltungen."
                description="Schreib einem Beispielprofil, um die erste Unterhaltung zu beginnen."
              />
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ChatLabel</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Fest</h3>
          <div className="flex flex-wrap gap-2">
            <ChatLabel label="Neue Anfrage" />
            <ChatLabel label="Bestätigt" />
            <ChatLabel label="Beispiellabel mit einem langen Namen" />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Entfernbar</h3>
          <div className="flex min-h-11 flex-wrap items-center gap-6">
            {labels.length === 0 ? <p className="text-small text-ink-muted">Alle Beispiellabels sind entfernt.</p> : null}
            {labels.map((label) => (
              <ChatLabel key={label} label={label} removeLabel={`Label «${label}» entfernen`} onRemove={() => setLabels((current) => current.filter((item) => item !== label))} />
            ))}
          </div>
        </div>
      </section>

      <CommunicationThreadDemo />

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">BookingRequestCard</h2>
        <p role="status" className="text-small text-ink-muted">
          Zuletzt gewählt: {lastAction}
        </p>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Offen, mit fertigen Buttons</h3>
          <BookingRequestCard
            className="max-w-panel"
            title="Terminanfrage von Beispielname"
            details={bookingDetails}
            status={{ kind: "pending", label: "Offen" }}
            labels={bookingLabels}
            onAccept={() => setLastAction("Anfrage zusagen")}
            onCounter={() => setLastAction("Gegenvorschlag senden")}
            onDecline={() => setLastAction("Anfrage ablehnen")}
            view={{ label: "Anfrage ansehen", href: "#anfrage-ansehen" }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Zusage wird gesendet</h3>
          <BookingRequestCard
            className="max-w-panel"
            title="Terminanfrage von Beispielname"
            details={bookingDetails}
            status={{ kind: "pending", label: "Offen" }}
            labels={bookingLabels}
            busy="accept"
            onAccept={() => undefined}
            onCounter={() => undefined}
            onDecline={() => undefined}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ohne Aktionen: zugesagt, Gegenvorschlag, abgelehnt, zurückgezogen, abgelaufen</h3>
          <div className="grid max-w-content gap-4 md:grid-cols-2">
            <BookingRequestCard title="Terminanfrage an Beispielname" details={bookingDetails} status={{ kind: "accepted", label: "Zugesagt" }} view={{ label: "Termin ansehen", href: "#termin-ansehen" }} />
            <BookingRequestCard title="Terminanfrage an Beispielname" details={bookingDetails} status={{ kind: "countered", label: "Gegenvorschlag erhalten" }} />
            <BookingRequestCard title="Terminanfrage an Beispielname" details={bookingDetails} status={{ kind: "declined", label: "Abgelehnt" }} />
            <BookingRequestCard title="Terminanfrage an Beispielname" details={bookingDetails.slice(0, 2)} status={{ kind: "cancelled", label: "Zurückgezogen" }} />
            <BookingRequestCard title="Terminanfrage an Beispielname" details={bookingDetails.slice(0, 2)} status={{ kind: "expired", label: "Abgelaufen" }} />
          </div>
        </div>
      </section>

      <CommunicationReportDemo />
    </div>
  );
}
