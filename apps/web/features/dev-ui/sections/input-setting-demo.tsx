"use client";

import { Slider, Switch, type SwitchStatus } from "@app/ui";
import { useEffect, useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const statusLabels: Record<SwitchStatus, string> = {
  idle: "",
  saving: "Wird gespeichert",
  saved: "Gespeichert",
  error: "Nicht gespeichert. Die Einstellung ist unverändert.",
};

const kilometres = (value: number) => `${value} km`;
const francs = (value: number) => `CHF ${value}`;

/** Switch und Slider der Testseite «Eingabe». */
export function InputSettingDemo() {
  return (
    <>
      <SwitchDemo />
      <SliderDemo />
    </>
  );
}

function SwitchDemo() {
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<SwitchStatus>("idle");

  // Die Testseite spielt das Speichern nach: nach kurzer Zeit gilt die Einstellung als gespeichert.
  useEffect(() => {
    if (status !== "saving") return;
    const timer = window.setTimeout(() => setStatus("saved"), 900);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Switch</h2>
      <InputDemoBlock title="Ruhe und eingeschaltet">
        <Switch label="Beispielprofil pausieren" description="Dein Profil erscheint so lange nicht in der Suche." />
        <Switch label="Online-Status zeigen" defaultChecked />
      </InputDemoBlock>
      <InputDemoBlock title="Speichert sofort, mit Bestätigung am Ort">
        <Switch
          label="E-Mail bei neuer Nachricht"
          description="Schalte um, um den Ablauf zu sehen."
          checked={checked}
          status={status}
          statusLabel={statusLabels[status]}
          onCheckedChange={(next) => {
            setChecked(next);
            setStatus("saving");
          }}
        />
      </InputDemoBlock>
      <InputDemoBlock title="Lädt, gespeichert, Fehler">
        <Switch label="Beispieleinstellung eins" defaultChecked status="saving" statusLabel={statusLabels.saving} />
        <Switch label="Beispieleinstellung zwei" defaultChecked status="saved" statusLabel={statusLabels.saved} />
        <Switch label="Beispieleinstellung drei" status="error" statusLabel={statusLabels.error} />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <Switch label="Nur der Inhaber kann diese Einstellung ändern" disabled />
        <Switch label="Eingeschaltet und nicht änderbar" disabled defaultChecked />
      </InputDemoBlock>
    </section>
  );
}

function SliderDemo() {
  const [radius, setRadius] = useState(25);
  const [price, setPrice] = useState<[number, number]>([150, 400]);
  const [committed, setCommitted] = useState("Noch nichts losgelassen");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Slider</h2>
      <InputDemoBlock title="Ein Wert: Umkreis">
        <Slider label="Umkreis" min={5} max={100} step={5} value={radius} onValueChange={setRadius} formatValue={kilometres} hint="Pfeiltasten ändern den Wert in Schritten von 5 km." />
      </InputDemoBlock>
      <InputDemoBlock title="Bereich: Preis von bis">
        <Slider
          label="Preis pro Stunde"
          min={0}
          max={800}
          step={10}
          minStepsBetweenThumbs={1}
          value={price}
          onValueChange={setPrice}
          onValueCommit={([from, to]) => setCommitted(`${francs(from)} bis ${francs(to)}`)}
          formatValue={francs}
          thumbLabels={["Preis von", "Preis bis"]}
        />
        <p role="status" className="text-small text-ink-muted">
          Zuletzt losgelassen: {committed}
        </p>
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <Slider label="Umkreis" min={5} max={100} defaultValue={40} formatValue={kilometres} disabled />
      </InputDemoBlock>
    </section>
  );
}
