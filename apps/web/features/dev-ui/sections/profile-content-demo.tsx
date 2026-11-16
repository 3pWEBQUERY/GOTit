"use client";

import { Button, RateTable, ReviewItem, ServiceList } from "@app/ui";
import { Flag } from "lucide-react";

const rateColumns = { duration: "Dauer", price: "Preis", note: "Hinweis" };

const rates = [
  { key: "1", duration: "1 Std.", price: "CHF 000", note: "Beispielhinweis zum Preis" },
  { key: "2", duration: "2 Std.", price: "CHF 000", note: "" },
  { key: "3", duration: "Über Nacht", price: "CHF 0000", note: "Beispielhinweis: nur nach Absprache, mindestens zwei Tage im Voraus" },
];

const groupedServices = [
  {
    key: "a",
    heading: "Beispielgruppe A",
    items: [
      { key: "1", label: "Beispielangebot 1" },
      { key: "2", label: "Beispielangebot 2", note: "nach Absprache" },
      { key: "3", label: "Beispielangebot 3" },
    ],
  },
  {
    key: "b",
    heading: "Beispielgruppe B",
    items: [
      { key: "4", label: "Beispielangebot 4" },
      { key: "5", label: "Beispielangebot 5 mit einer längeren Bezeichnung" },
    ],
  },
];

const ratings = [
  { key: "communication", label: "Kommunikation", value: "5 von 5" },
  { key: "punctuality", label: "Pünktlichkeit", value: "4 von 5" },
  { key: "accuracy", label: "Profil stimmt", value: "5 von 5" },
];

/** RateTable, ServiceList und ReviewItem der Testseite «Profil». */
export function ProfileContentDemo() {
  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">RateTable</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mit Preisen</h3>
          <RateTable className="max-w-reading" caption="Preise von Beispielname" columns={rateColumns} rows={rates} emptyText="Preise auf Anfrage" updatedText="Stand: 02.11.2026" />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ohne Preise</h3>
          <RateTable caption="Preise von Beispielname Zwei" columns={rateColumns} rows={[]} emptyText="Preise auf Anfrage" />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ServiceList</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Gruppiert</h3>
          <ServiceList className="max-w-reading" groups={groupedServices} headingLevel={4} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ohne Gruppen</h3>
          <ServiceList className="max-w-reading" groups={[{ key: "all", items: groupedServices.flatMap((group) => group.items) }]} />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ReviewItem</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mit Kategorien, Stellungnahme und Aktion</h3>
          <ReviewItem
            date="12.10.2026"
            dateTime="2026-10-12"
            verification="Nach bestätigtem Termin"
            ratings={ratings}
            response={{ label: "Stellungnahme von Beispielname", date: "14.10.2026", text: "Beispieltext einer Stellungnahme. Danke für deine Rückmeldung." }}
            actions={
              <Button variant="quiet" icon={<Flag aria-hidden strokeWidth={1.5} />}>
                Bewertung melden
              </Button>
            }
          >
            Beispieltext einer Bewertung. Die Absprache war klar und der Termin fand wie vereinbart statt.
          </ReviewItem>
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Nur Text</h3>
          <ReviewItem date="03.09.2026" dateTime="2026-09-03" verification="Nach bestätigtem Termin">
            Beispieltext einer kurzen Bewertung.
          </ReviewItem>
        </div>
      </section>
    </>
  );
}
