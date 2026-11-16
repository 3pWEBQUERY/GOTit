"use client";

import { Checkbox, CheckboxGroup, RadioGroup } from "@app/ui";
import { useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const languages = ["Deutsch", "Französisch", "Italienisch"];

const meetingOptions = [
  { value: "studio", label: "Im Beispielstudio", description: "Du kommst an die Beispieladresse." },
  { value: "besuch", label: "Hausbesuch", description: "Der Termin findet bei dir statt." },
  { value: "hotel", label: "Hotelbesuch", disabled: true, description: "Im Beispiel nicht wählbar." },
];

/** Checkbox, CheckboxGroup und RadioGroup der Testseite «Eingabe». */
export function InputChoiceDemo() {
  return (
    <>
      <CheckboxDemo />
      <RadioGroupDemo />
    </>
  );
}

function CheckboxDemo() {
  const [chosen, setChosen] = useState<string[]>(["Deutsch"]);
  const allState = chosen.length === languages.length ? true : chosen.length === 0 ? false : "indeterminate";
  const toggle = (language: string, checked: boolean) => setChosen((current) => (checked ? [...current, language] : current.filter((entry) => entry !== language)));

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Checkbox</h2>
      <InputDemoBlock title="Ruhe und ausgewählt">
        <Checkbox label="Benachrichtige mich bei neuen Beispielprofilen" />
        <Checkbox label="Merkliste mit anderen Geräten abgleichen" description="Die Beschreibung erklärt, was die Auswahl bewirkt." defaultChecked />
      </InputDemoBlock>
      <InputDemoBlock title="Zwischenzustand">
        <Checkbox label="Alle Sprachen" checked={allState} onCheckedChange={(checked) => setChosen(checked === true ? languages : [])} />
        <div className="flex flex-col pl-8">
          {languages.map((language) => (
            <Checkbox key={language} label={language} checked={chosen.includes(language)} onCheckedChange={(checked) => toggle(language, checked === true)} />
          ))}
        </div>
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <Checkbox label="Ich akzeptiere die Beispielbedingungen" error="Bestätige die Bedingungen, um fortzufahren." />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <Checkbox label="Nicht wählbar" disabled />
        <Checkbox label="Nicht änderbar, ausgewählt" disabled defaultChecked />
      </InputDemoBlock>

      <h2 className="text-h2">CheckboxGroup</h2>
      <InputDemoBlock title="Ruhe">
        <CheckboxGroup label="Sprachen" hint="Wähle alle Sprachen, in denen du schreibst.">
          <Checkbox label="Deutsch" name="sprachen" value="de" defaultChecked />
          <Checkbox label="Französisch" name="sprachen" value="fr" />
          <Checkbox label="Italienisch" name="sprachen" value="it" />
        </CheckboxGroup>
      </InputDemoBlock>
      <InputDemoBlock title="Optional">
        <CheckboxGroup label="Weitere Angaben" optionalLabel="optional">
          <Checkbox label="Beispielangabe eins" />
          <Checkbox label="Beispielangabe zwei" />
        </CheckboxGroup>
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <CheckboxGroup label="Sprachen" error="Wähle mindestens eine Sprache.">
          <Checkbox label="Deutsch" />
          <Checkbox label="Französisch" />
        </CheckboxGroup>
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <CheckboxGroup label="Sprachen" disabled>
          <Checkbox label="Deutsch" defaultChecked disabled />
          <Checkbox label="Französisch" disabled />
        </CheckboxGroup>
      </InputDemoBlock>
    </section>
  );
}

function RadioGroupDemo() {
  const [meeting, setMeeting] = useState("studio");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">RadioGroup</h2>
      <InputDemoBlock title="Ruhe">
        <RadioGroup label="Ort des Termins" options={meetingOptions} name="ort-ruhe" />
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <RadioGroup label="Ort des Termins" options={meetingOptions} value={meeting} onValueChange={setMeeting} hint="Du kannst den Ort bis zur Bestätigung ändern." />
      </InputDemoBlock>
      <InputDemoBlock title="Nebeneinander, optional">
        <RadioGroup
          label="Dauer"
          optionalLabel="optional"
          orientation="horizontal"
          options={[
            { value: "60", label: "1 Stunde" },
            { value: "90", label: "1,5 Stunden" },
            { value: "120", label: "2 Stunden" },
          ]}
        />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <RadioGroup label="Ort des Termins" options={meetingOptions} error="Wähle, wo der Termin stattfindet." />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <RadioGroup label="Ort des Termins" options={meetingOptions} defaultValue="besuch" disabled />
      </InputDemoBlock>
    </section>
  );
}
