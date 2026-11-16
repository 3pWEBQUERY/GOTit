"use client";

import { DateField, TimeField } from "@app/ui";
import { useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const dateLabels = {
  openCalendar: "Kalender öffnen",
  previousMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  invalidFormat: "Gib das Datum als TT.MM.JJJJ ein, zum Beispiel 19.11.2026.",
  outOfRange: "Dieser Tag liegt ausserhalb des buchbaren Zeitraums.",
};

const timeLabels = {
  invalidFormat: "Gib die Zeit als HH:MM ein, zum Beispiel 14:30.",
  notOnStep: "Wähle eine Zeit im Viertelstundentakt, zum Beispiel 14:15.",
};

const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30", "15:00"];

/** Im Beispiel ist das Studio sonntags geschlossen. */
function closedOnSunday(iso: string): string | null {
  return new Date(`${iso}T00:00:00Z`).getUTCDay() === 0 ? "Sonntags ist das Beispielstudio geschlossen." : null;
}

/** DateField und TimeField der Testseite «Eingabe». */
export function InputDateDemo() {
  return (
    <>
      <DateFieldDemo />
      <TimeFieldDemo />
    </>
  );
}

function DateFieldDemo() {
  const [date, setDate] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">DateField</h2>
      <InputDemoBlock title="Ruhe">
        <DateField label="Datum" locale="de-CH" labels={dateLabels} value={date} onValueChange={setDate} placeholder="TT.MM.JJJJ" hint="Format: TT.MM.JJJJ" name="datum" />
        <p role="status" className="tabular text-small text-ink-muted">
          Wert: {date ?? "leer"}
        </p>
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <DateField label="Datum" locale="de-CH" labels={dateLabels} defaultValue="2026-11-19" hint="Format: TT.MM.JJJJ" />
      </InputDemoBlock>
      <InputDemoBlock title="Optional">
        <DateField label="Ausweichdatum" optionalLabel="optional" locale="de-CH" labels={dateLabels} placeholder="TT.MM.JJJJ" />
      </InputDemoBlock>
      <InputDemoBlock title="Nicht wählbare Tage sind erklärt">
        <DateField
          label="Termin im November und Dezember 2026"
          locale="de-CH"
          labels={dateLabels}
          value={blocked}
          onValueChange={setBlocked}
          min="2026-11-16"
          max="2026-12-31"
          today="2026-11-16"
          isDateDisabled={closedOnSunday}
          placeholder="TT.MM.JJJJ"
          hint="Sonntage und Tage ausserhalb des Zeitraums sind gesperrt. Tippe 22.11.2026, um den Grund am Feld zu sehen."
        />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <DateField label="Datum" locale="de-CH" labels={dateLabels} error="An diesem Tag ist kein Termin mehr frei. Wähle einen anderen Tag." defaultValue="2026-11-20" />
      </InputDemoBlock>
      <InputDemoBlock title="Nur lesen und deaktiviert">
        <DateField label="Mitglied seit" locale="de-CH" labels={dateLabels} defaultValue="2026-01-09" readOnly />
        <DateField label="Datum" locale="de-CH" labels={dateLabels} defaultValue="2026-11-19" disabled />
      </InputDemoBlock>
    </section>
  );
}

function TimeFieldDemo() {
  const [time, setTime] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">TimeField</h2>
      <InputDemoBlock title="Ruhe">
        <TimeField label="Beginn" labels={timeLabels} value={time} onValueChange={setTime} placeholder="HH:MM" hint="24 Stunden, Format: HH:MM. Geprüft wird beim Verlassen des Felds." name="beginn" />
        <p role="status" className="tabular text-small text-ink-muted">
          Wert: {time ?? "leer"}
        </p>
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <TimeField label="Beginn" labels={timeLabels} defaultValue="14:30" />
      </InputDemoBlock>
      <InputDemoBlock title="Im Viertelstundentakt, optional">
        <TimeField label="Ende" optionalLabel="optional" labels={timeLabels} step={15} placeholder="HH:MM" hint="Tippe 14:10, um den Fehler zu sehen." />
      </InputDemoBlock>
      <InputDemoBlock title="Auswahl erlaubter Zeiten">
        <TimeField label="Freie Zeit" labels={timeLabels} options={slots} value={slot} onValueChange={setSlot} placeholder="Zeit wählen" />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <TimeField label="Beginn" labels={timeLabels} defaultValue="08:00" error="Das Beispielstudio öffnet um 09:00. Wähle eine spätere Zeit." />
      </InputDemoBlock>
      <InputDemoBlock title="Nur lesen und deaktiviert">
        <TimeField label="Beginn" labels={timeLabels} defaultValue="09:00" readOnly />
        <TimeField label="Beginn" labels={timeLabels} defaultValue="09:00" disabled />
      </InputDemoBlock>
    </section>
  );
}
