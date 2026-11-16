"use client";

import { Field, SearchField, TextArea, TextField } from "@app/ui";
import { Mail } from "lucide-react";
import { useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const countLabel = (used: number, max: number) => `${used} von ${max} Zeichen`;

/** Field, TextField, TextArea und SearchField der Testseite «Eingabe». */
export function InputTextDemo() {
  return (
    <>
      <FieldDemo />
      <TextFieldDemo />
      <TextAreaDemo />
      <SearchFieldDemo />
    </>
  );
}

function FieldDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Field</h2>
      <InputDemoBlock title="Rahmen um ein eigenes Bedienelement">
        <Field label="Beispielwert" hint="Der Rahmen liefert Label, Hinweis und Fehler für jedes Bedienelement." optionalLabel="optional">
          {(control) => <input {...control} type="text" className="min-h-11 rounded-control border border-border-strong bg-surface px-3 text-body" />}
        </Field>
      </InputDemoBlock>
    </section>
  );
}

function TextFieldDemo() {
  const [email, setEmail] = useState("beispiel");
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">TextField</h2>
      <InputDemoBlock title="Ruhe">
        <TextField label="Anzeigename" placeholder="Beispielname" hint="So erscheinst du in der Suche." />
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <TextField label="Anzeigename" defaultValue="Beispielname Muster" />
      </InputDemoBlock>
      <InputDemoBlock title="Optional">
        <TextField label="Webseite" optionalLabel="optional" placeholder="www.beispiel.example" />
      </InputDemoBlock>
      <InputDemoBlock title="Präfix und Suffix">
        <TextField label="Preis pro Stunde" prefix="CHF" suffix="pro Stunde" inputMode="numeric" defaultValue="300" />
        <TextField label="E-Mail" type="email" prefix={<Mail aria-hidden strokeWidth={1.5} />} placeholder="name@beispiel.example" />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler, Prüfung beim Verlassen">
        <TextField
          label="E-Mail"
          type="email"
          value={email}
          hint="Format: name@beispiel.example"
          error={emailError}
          onChange={(event) => setEmail(event.currentTarget.value)}
          onBlur={() => setEmailError(email.includes("@") ? undefined : "Der Adresse fehlt das @-Zeichen. Prüfe deine Eingabe.")}
        />
        <TextField label="Ort" defaultValue="Musterhausen" error="Diesen Ort kennen wir nicht. Wähle einen Ort aus der Liste." />
      </InputDemoBlock>
      <InputDemoBlock title="Nur lesen">
        <TextField label="Mitgliedsnummer" readOnly defaultValue="BEISPIEL-0000" hint="Diese Nummer kannst du nicht ändern." />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <TextField label="Anzeigename" disabled defaultValue="Beispielname Muster" />
      </InputDemoBlock>
    </section>
  );
}

function TextAreaDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">TextArea</h2>
      <InputDemoBlock title="Ruhe">
        <TextArea label="Über dich" placeholder="Beispieltext über dich" hint="Schreib in ganzen Sätzen." />
      </InputDemoBlock>
      <InputDemoBlock title="Mit Zeichenzähler">
        <TextArea label="Kurzbeschreibung" maxLength={160} countLabel={countLabel} defaultValue="Das ist ein Beispieltext für die Testseite." />
      </InputDemoBlock>
      <InputDemoBlock title="Wächst mit dem Inhalt">
        <TextArea label="Nachricht" autoGrow rows={2} optionalLabel="optional" defaultValue="Schreib mehrere Zeilen, das Feld wächst mit." />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <TextArea label="Über dich" defaultValue="Zu kurz" error="Der Text braucht mindestens 40 Zeichen. Deine Eingabe ist erhalten." />
      </InputDemoBlock>
      <InputDemoBlock title="Nur lesen und deaktiviert">
        <TextArea label="Hinweis des Beispielstudios" readOnly rows={2} defaultValue="Dieser Beispieltext lässt sich nur lesen." />
        <TextArea label="Über dich" disabled rows={2} defaultValue="Beispieltext" />
      </InputDemoBlock>
    </section>
  );
}

function SearchFieldDemo() {
  const [lastSearch, setLastSearch] = useState("Noch nichts gesucht");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">SearchField</h2>
      <p role="status" className="text-small text-ink-muted">
        Zuletzt gesucht: {lastSearch}
      </p>
      <InputDemoBlock title="Ruhe, Label nur für Screenreader">
        <SearchField label="Beispielprofile durchsuchen" hideLabel clearLabel="Suche leeren" placeholder="Ort oder Beispielname" onSearch={setLastSearch} />
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt, mit sichtbarem Label">
        <SearchField label="Suche" clearLabel="Suche leeren" defaultValue="Musterhausen" onSearch={setLastSearch} />
      </InputDemoBlock>
      <InputDemoBlock title="Als Suchformular">
        <SearchField label="Hilfe durchsuchen" clearLabel="Suche leeren" asForm action="#" name="q" placeholder="Beispielfrage" hint="Enter sendet das Formular." />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <SearchField label="Suche" clearLabel="Suche leeren" disabled defaultValue="Beispiel" />
      </InputDemoBlock>
    </section>
  );
}
