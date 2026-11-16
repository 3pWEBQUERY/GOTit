"use client";

import { AvailabilityBadge, SponsoredLabel, TrustSignals, type TrustSignal } from "@app/ui";
import { CalendarCheck } from "lucide-react";

const trustSignals: TrustSignal[] = [
  {
    key: "identity",
    label: "Identität geprüft",
    infoLabel: "Erklärung zu «Identität geprüft» anzeigen",
    explanation: {
      checked: "Beispieltext: Ein amtlicher Ausweis wurde mit der Person abgeglichen.",
      checkedAt: "Geprüft am 01.11.2026",
      notImplied: "Beispieltext: Das Signal sagt nichts über die Qualität des Angebots.",
    },
  },
  {
    key: "photos",
    label: "Fotos geprüft",
    infoLabel: "Erklärung zu «Fotos geprüft» anzeigen",
    explanation: {
      checked: "Beispieltext: Die Fotos wurden mit einer aktuellen Aufnahme verglichen.",
      checkedAt: "Geprüft am 02.11.2026",
      notImplied: "Beispieltext: Das Signal sagt nichts darüber, wann die Fotos entstanden sind.",
    },
  },
];

/** TrustSignals, AvailabilityBadge und SponsoredLabel der Testseite «Profil». */
export function ProfileTrustDemo() {
  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">TrustSignals</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mit Erklärung und Aktualisierung</h3>
          <TrustSignals
            className="max-w-80"
            label="Vertrauenssignale von Beispielname"
            closeLabel="Erklärung schliessen"
            explanationLabels={{ checked: "Was geprüft wurde", checkedAt: "Wann", notImplied: "Was das Signal nicht aussagt" }}
            signals={trustSignals}
            updated={{ label: "Aktualisiert vor 3 Tagen", exact: "13.11.2026", dateTime: "2026-11-13" }}
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ein Signal, ohne Aktualisierung</h3>
          <TrustSignals
            className="max-w-80"
            label="Vertrauenssignale von Beispielname Zwei"
            closeLabel="Erklärung schliessen"
            explanationLabels={{ checked: "Was geprüft wurde", checkedAt: "Wann", notImplied: "Was das Signal nicht aussagt" }}
            signals={trustSignals.slice(0, 1)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">AvailabilityBadge</h2>
        <div className="flex flex-col items-start gap-3">
          <AvailabilityBadge label="Heute verfügbar" />
          <AvailabilityBadge label="Heute 14–22 Uhr" />
          <AvailabilityBadge label="Nächster Termin Do, 19.11." icon={<CalendarCheck strokeWidth={1.5} />} />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">SponsoredLabel</h2>
        <div className="flex flex-wrap items-center gap-3">
          <SponsoredLabel label="Anzeige" />
          <SponsoredLabel label="Annonce" />
        </div>
      </section>
    </>
  );
}
