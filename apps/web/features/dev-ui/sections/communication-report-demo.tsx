"use client";

import { Button, ReportDialog, type ReportDialogLabels, type ReportSubmission } from "@app/ui";
import { Flag } from "lucide-react";
import { useState } from "react";

const reasons = [
  { value: "spam", label: "Beispielgrund: Werbung oder Spam" },
  { value: "false", label: "Beispielgrund: falsche Angaben", description: "Beispieltext, der den Grund genauer beschreibt." },
  { value: "danger", label: "Beispielgrund: Bedrohung oder Gefahr", urgent: true },
];

const labels: ReportDialogLabels = {
  title: "Nachricht melden",
  description: "Deine Meldung geht an das Team. Die gemeldete Person erfährt nicht, wer gemeldet hat.",
  close: "Meldung abbrechen",
  reasonLegend: "Was trifft zu?",
  reasonMissing: "Wähle einen Grund, damit das Team die Meldung einordnen kann.",
  urgentTitle: "Bei akuter Gefahr wende dich zuerst an die Polizei.",
  urgentText: "Deine Meldung wird trotzdem vorrangig bearbeitet.",
  next: "Beschreibung ergänzen",
  back: "Grund ändern",
  detailsLabel: "Was ist passiert?",
  detailsHint: "Beschreib kurz, was dir aufgefallen ist. Die Nachricht selbst hängt bereits an der Meldung.",
  optional: "optional",
  submit: "Meldung senden",
  sentTitle: "Deine Meldung ist beim Team.",
  sentText: "Du erhältst eine Mitteilung, sobald sie bearbeitet ist.",
  done: "Dialog schliessen",
  errorTitle: "Die Meldung wurde nicht gesendet.",
  errorText: "Die Verbindung ist unterbrochen. Grund und Beschreibung sind erhalten; sende die Meldung erneut.",
  step: (current, total) => `Schritt ${current} von ${total}`,
};

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

/** ReportDialog der Testseite «Kommunikation»: Erfolg und Fehler. */
export function CommunicationReportDemo() {
  const [last, setLast] = useState("Noch keine Meldung gesendet");

  async function succeed(report: ReportSubmission) {
    await wait(900);
    setLast(`Gesendet mit Grund «${report.reason}»${report.details ? " und Beschreibung" : ""}`);
  }

  async function fail() {
    await wait(900);
    throw new Error("Beispielfehler");
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">ReportDialog</h2>
      <p role="status" className="text-small text-ink-muted">
        {last}
      </p>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Senden gelingt</h3>
        <div>
          <ReportDialog trigger={<Button icon={<Flag aria-hidden strokeWidth={1.5} />}>Nachricht melden</Button>} reasons={reasons} labels={labels} onSubmit={succeed} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Senden schlägt fehl, Eingaben bleiben erhalten</h3>
        <div>
          <ReportDialog
            trigger={<Button icon={<Flag aria-hidden strokeWidth={1.5} />}>Beispielprofil melden</Button>}
            reasons={reasons}
            labels={{ ...labels, title: "Beispielprofil melden" }}
            onSubmit={fail}
          />
        </div>
      </div>
    </section>
  );
}
