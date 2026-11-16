"use client";

import { BOOKING_STATUSES, BookingTimeline, StatusPill, type BookingTimelineEvent } from "@app/ui";
import { TimeDemoBlock } from "./time-demo-block";
import { statusWords } from "./time-demo-data";

const events: BookingTimelineEvent[] = [
  { id: "4", status: "confirmed", statusLabel: "Bestätigt", time: "vor 2 Stunden", exactTime: "16.11.2026, 12:05", dateTime: "2026-11-16T12:05", actor: "Beispielname (Anbieter)" },
  {
    id: "3",
    status: "negotiating",
    statusLabel: "In Abstimmung",
    time: "gestern, 19:10",
    exactTime: "15.11.2026, 19:10",
    dateTime: "2026-11-15T19:10",
    actor: "Beispielgast",
    note: "Beispieltext einer Notiz: Der Beginn wurde auf 18:00 verschoben.",
  },
  { id: "2", status: "negotiating", statusLabel: "In Abstimmung", time: "gestern, 18:52", exactTime: "15.11.2026, 18:52", dateTime: "2026-11-15T18:52", actor: "Beispielname (Anbieter)" },
  { id: "1", status: "requested", statusLabel: "Angefragt", time: "vor 2 Tagen", exactTime: "14.11.2026, 21:30", dateTime: "2026-11-14T21:30", actor: "Beispielgast" },
];

const cancelled: BookingTimelineEvent[] = [
  { id: "1", status: "requested", statusLabel: "Angefragt", time: "10.11.2026, 09:00", exactTime: "10.11.2026, 09:00", dateTime: "2026-11-10T09:00", actor: "Beispielgast" },
  { id: "2", status: "expired", statusLabel: "Abgelaufen", time: "12.11.2026, 09:00", exactTime: "12.11.2026, 09:00", dateTime: "2026-11-12T09:00", actor: "System", note: "Die Anfrage wurde nicht innerhalb von 48 Stunden beantwortet." },
];

/** StatusPill und BookingTimeline der Testseite «Zeit». */
export function TimeStatusDemo() {
  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">StatusPill</h2>
        <TimeDemoBlock title="Alle acht Status" wide>
          <ul className="flex flex-wrap gap-2">
            {BOOKING_STATUSES.map((status) => (
              <li key={status}>
                <StatusPill status={status} label={statusWords[status]} />
              </li>
            ))}
          </ul>
        </TimeDemoBlock>
        <TimeDemoBlock title="Im Satz">
          <p className="flex flex-wrap items-center gap-2 text-body">
            <span>Terminanfrage von Beispielgast</span>
            <StatusPill status="negotiating" label="In Abstimmung" />
          </p>
        </TimeDemoBlock>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">BookingTimeline</h2>
        <TimeDemoBlock title="Neuestes Ereignis zuerst">
          <BookingTimeline label="Verlauf der Terminanfrage von Beispielgast" events={events} latestLabel="Aktueller Stand:" />
        </TimeDemoBlock>
        <TimeDemoBlock title="Zeitlich aufsteigend, neuestes zuletzt">
          <BookingTimeline label="Verlauf einer abgelaufenen Terminanfrage" events={cancelled} newest="last" latestLabel="Aktueller Stand:" />
        </TimeDemoBlock>
        <TimeDemoBlock title="Ein einzelnes Ereignis ohne Icon">
          <BookingTimeline label="Verlauf einer neuen Terminanfrage" events={[{ id: "1", statusLabel: "Angefragt", time: "gerade eben", exactTime: "16.11.2026, 14:00", actor: "Beispielgast" }]} />
        </TimeDemoBlock>
      </section>
    </>
  );
}
