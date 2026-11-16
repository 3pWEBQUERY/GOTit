"use client";

import { AvailabilityEditor, Button, emptyAvailability, isAvailabilityValid, type AvailabilityValue } from "@app/ui";
import { useState } from "react";
import { TimeDemoBlock } from "./time-demo-block";

const dayLabels = { mon: "Montag", tue: "Dienstag", wed: "Mittwoch", thu: "Donnerstag", fri: "Freitag", sat: "Samstag", sun: "Sonntag" };

const labels = {
  available: (day: string) => `${day} verfügbar`,
  unavailable: "Nicht verfügbar",
  from: "Von",
  to: "Bis",
  window: (day: string, position: number) => `${day}, Zeitfenster ${position}`,
  addWindow: "Zeitfenster hinzufügen",
  removeWindow: "Zeitfenster entfernen",
  errors: {
    endBeforeStart: "Das Ende muss nach dem Beginn liegen. Wähle eine spätere Zeit.",
    overlap: "Dieses Zeitfenster überschneidet ein anderes am selben Tag. Passe den Beginn an.",
    incomplete: "Gib eine Zeit ein oder entferne das Zeitfenster.",
  },
  timeField: { invalidFormat: "Gib die Zeit als HH:MM ein, zum Beispiel 14:30." },
};

const bufferOptions = [
  { value: "0", label: "Kein Puffer" },
  { value: "15", label: "15 Minuten" },
  { value: "30", label: "30 Minuten" },
  { value: "60", label: "60 Minuten" },
];

const initial: AvailabilityValue = {
  ...emptyAvailability(),
  mon: [{ from: "14:00", to: "20:00" }],
  tue: [{ from: "14:00", to: "20:00" }],
  wed: [
    { from: "09:00", to: "12:00" },
    { from: "14:00", to: "20:00" },
  ],
};

const faulty: AvailabilityValue = {
  ...emptyAvailability(),
  thu: [{ from: "18:00", to: "16:00" }],
  fri: [
    { from: "10:00", to: "14:00" },
    { from: "13:00", to: "17:00" },
  ],
};

/** AvailabilityEditor der Testseite «Zeit». */
export function TimeAvailabilityDemo() {
  const [value, setValue] = useState(initial);
  const [buffer, setBuffer] = useState("15");
  const [faultyValue, setFaultyValue] = useState(faulty);
  const [attempted, setAttempted] = useState(false);
  const valid = isAvailabilityValid(value);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">AvailabilityEditor</h2>
      <TimeDemoBlock title="Arbeitszeiten mit Puffer">
        <AvailabilityEditor
          value={value}
          onValueChange={setValue}
          dayLabels={dayLabels}
          labels={labels}
          placeholder="HH:MM"
          showAllErrors={attempted}
          buffer={{ label: "Puffer zwischen Terminen", value: buffer, onValueChange: setBuffer, options: bufferOptions, hint: "In dieser Zeit nach einem Termin bist du nicht buchbar." }}
        />
        <div>
          <Button variant="primary" onClick={() => setAttempted(true)}>
            Arbeitszeiten speichern
          </Button>
        </div>
        <p role="status" className="text-small text-ink-muted">
          {attempted ? (valid ? "Die Arbeitszeiten sind gültig und würden gespeichert." : "Noch nicht gespeichert. Korrigiere die markierten Zeitfenster.") : "Geprüft wird beim Verlassen eines Felds und beim Speichern."}
        </p>
      </TimeDemoBlock>
      <TimeDemoBlock title="Fehler: Ende vor Beginn und Überlappung">
        <AvailabilityEditor value={faultyValue} onValueChange={setFaultyValue} dayLabels={dayLabels} labels={labels} placeholder="HH:MM" showAllErrors />
      </TimeDemoBlock>
      <TimeDemoBlock title="Deaktiviert">
        <AvailabilityEditor value={initial} onValueChange={() => undefined} dayLabels={dayLabels} labels={labels} disabled />
      </TimeDemoBlock>
    </section>
  );
}
