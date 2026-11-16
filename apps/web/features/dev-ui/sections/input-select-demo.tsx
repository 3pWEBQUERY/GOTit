"use client";

import { Combobox, Select } from "@app/ui";
import { useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const regions = [
  { value: "nord", label: "Beispielregion Nord" },
  { value: "sued", label: "Beispielregion Süd" },
  { value: "ost", label: "Beispielregion Ost" },
  { value: "west", label: "Beispielregion West", disabled: true },
];

const places = [
  { value: "musterhausen", label: "Musterhausen" },
  { value: "beispielstadt", label: "Beispielstadt" },
  { value: "probedorf", label: "Probedorf" },
  { value: "testlingen", label: "Testlingen", disabled: true },
  { value: "demowil", label: "Demowil" },
  { value: "vorlagenberg", label: "Vorlagenberg" },
];

/** Select und Combobox der Testseite «Eingabe». */
export function InputSelectDemo() {
  return (
    <>
      <SelectDemo />
      <ComboboxDemo />
    </>
  );
}

function SelectDemo() {
  const [region, setRegion] = useState("sued");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Select</h2>
      <InputDemoBlock title="Ruhe">
        <Select label="Region" options={regions} placeholder="Region wählen" hint="Die Region West ist im Beispiel nicht wählbar." />
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <Select label="Region" options={regions} value={region} onValueChange={setRegion} name="region" />
      </InputDemoBlock>
      <InputDemoBlock title="Optional">
        <Select label="Zweite Region" optionalLabel="optional" options={regions} placeholder="Region wählen" />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <Select label="Region" options={regions} placeholder="Region wählen" error="Wähle eine Region, damit dein Profil gefunden wird." />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <Select label="Region" options={regions} defaultValue="nord" disabled />
      </InputDemoBlock>
    </section>
  );
}

function ComboboxDemo() {
  const [place, setPlace] = useState<string | null>(null);
  const [filled, setFilled] = useState<string | null>("beispielstadt");
  const [missing, setMissing] = useState<string | null>(null);
  const [remote, setRemote] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Combobox</h2>
      <InputDemoBlock title="Ruhe">
        <Combobox
          label="Ort"
          options={places}
          value={place}
          onValueChange={setPlace}
          emptyLabel="Keine Treffer. Prüfe die Schreibweise."
          placeholder="Ort suchen"
          hint="Tippe, um die Liste zu filtern. Tippe zum Beispiel «xyz» für den Zustand ohne Treffer."
          name="ort"
        />
      </InputDemoBlock>
      <InputDemoBlock title="Ausgefüllt">
        <Combobox label="Ort" options={places} value={filled} onValueChange={setFilled} emptyLabel="Keine Treffer. Prüfe die Schreibweise." />
      </InputDemoBlock>
      <InputDemoBlock title="Optional">
        <Combobox label="Zweiter Ort" optionalLabel="optional" options={places} value={null} onValueChange={() => undefined} emptyLabel="Keine Treffer. Prüfe die Schreibweise." />
      </InputDemoBlock>
      <InputDemoBlock title="Lädt">
        <Combobox
          label="Ort"
          options={[]}
          filter="none"
          loading
          loadingLabel="Orte werden geladen"
          value={remote}
          onValueChange={setRemote}
          emptyLabel="Keine Treffer. Prüfe die Schreibweise."
          hint="Klick ins Feld, um den Ladezustand zu sehen."
        />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <Combobox
          label="Ort"
          options={places}
          value={missing}
          onValueChange={setMissing}
          emptyLabel="Keine Treffer. Prüfe die Schreibweise."
          error={missing ? undefined : "Wähle einen Ort aus der Liste."}
        />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <Combobox label="Ort" options={places} value="musterhausen" onValueChange={() => undefined} emptyLabel="Keine Treffer. Prüfe die Schreibweise." disabled />
      </InputDemoBlock>
    </section>
  );
}
