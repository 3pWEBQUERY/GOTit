"use client";

import { Button, EmptyState, ErrorState, ProgressSteps, type ProgressStep } from "@app/ui";
import { Images, SearchX } from "lucide-react";
import { useState } from "react";

const stepNames = ["Name", "Fotos", "Leistungen", "Tarife", "Verfügbarkeit"];

const stepLabels = { done: "erledigt", current: "aktueller Schritt", upcoming: "noch offen" };

function stepsAt(position: number, withLinks: boolean): ProgressStep[] {
  return stepNames.map((label, index) => ({
    id: label,
    label,
    state: index < position ? "done" : index === position ? "current" : "upcoming",
    href: withLinks && index < position ? `#schritt-${index + 1}` : undefined,
  }));
}

/** EmptyState, ErrorState und ProgressSteps der Testseite «Rückmeldung». */
export function FeedbackStatesDemo() {
  const [position, setPosition] = useState(1);

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">EmptyState</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Noch nichts angelegt</h3>
          <EmptyState
            icon={<Images strokeWidth={1.5} />}
            title="Hier stehen die Fotos deines Beispielprofils."
            description="Profile mit mindestens drei Fotos werden häufiger angesehen."
            action={<Button variant="primary">Erstes Foto hochladen</Button>}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Keine Treffer</h3>
          <EmptyState
            icon={<SearchX strokeWidth={1.5} />}
            title="Zu deinen Filtern gibt es in Musterstadt keine Treffer."
            action={<Button>Filter zurücksetzen</Button>}
          />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Nur ein Satz</h3>
          <EmptyState title="Hier erscheinen deine Beispielnachrichten, sobald dir jemand schreibt." />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ErrorState</h2>
        <ErrorState
          title="Die Beispielliste konnte nicht geladen werden."
          description="Deine Filter und deine Sammlung sind unverändert."
          action={
            <>
              <Button>Liste neu laden</Button>
              <Button variant="quiet">Störung melden</Button>
            </>
          }
        />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ProgressSteps</h2>
        <p className="max-w-prose text-small text-ink-muted">Ab 768 px Breite stehen die Schritte nebeneinander, darunter als eine Zeile mit Balken.</p>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Erledigte Schritte als Link</h3>
          <ProgressSteps
            label="Fortschritt des Beispielprofils"
            summary={`Schritt ${position + 1} von ${stepNames.length}: ${stepNames[position] ?? ""}`}
            labels={stepLabels}
            steps={stepsAt(position, true)}
          />
          <div className="flex flex-wrap gap-3">
            <Button disabled={position === 0} onClick={() => setPosition((current) => Math.max(0, current - 1))}>
              Einen Schritt zurückgehen
            </Button>
            <Button disabled={position === stepNames.length - 1} onClick={() => setPosition((current) => Math.min(stepNames.length - 1, current + 1))}>
              Zum nächsten Schritt gehen
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Erster Schritt, ohne Links</h3>
          <ProgressSteps label="Fortschritt der Beispielbuchung" summary={`Schritt 1 von ${stepNames.length}: Name`} labels={stepLabels} steps={stepsAt(0, false)} />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Letzter Schritt</h3>
          <ProgressSteps
            label="Fortschritt der Beispielprüfung"
            summary={`Schritt ${stepNames.length} von ${stepNames.length}: Verfügbarkeit`}
            labels={stepLabels}
            steps={stepsAt(stepNames.length - 1, false)}
          />
        </div>
      </section>
    </>
  );
}
