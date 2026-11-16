"use client";

import { Button, Sheet, SheetClose, SheetContent, SheetTrigger, type SheetDetent } from "@app/ui";
import { useState } from "react";

const districts = ["Beispielquartier Nord", "Beispielquartier Ost", "Beispielquartier Süd", "Beispielquartier West", "Musterstadt Zentrum", "Musterstadt Bahnhof"];

/** Sheet der Testseite «Rückmeldung»: Stufen halb und voll, selbst verwaltet und gesteuert. */
export function FeedbackSheetDemo() {
  const [detent, setDetent] = useState<SheetDetent>("full");

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Sheet</h2>
      <p className="max-w-prose text-small text-ink-muted">
        Das Sheet ist für Breiten unter 768 px gedacht. Der Griff wechselt per Tippen, Enter oder Leertaste die Stufe. Ziehen nach unten verkleinert oder schliesst.
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Start auf halber Höhe (Glas)</h3>
        <div>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Beispielfilter anzeigen</Button>
            </SheetTrigger>
            <SheetContent title="Quartier wählen" closeLabel="Filter schliessen" handleLabel="Höhe des Filters umschalten">
              <ul className="flex flex-col divide-y divide-border">
                {districts.map((district) => (
                  <li key={district} className="flex min-h-11 items-center text-body">
                    {district}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <SheetClose asChild>
                  <Button variant="primary" width="full">
                    Beispieltreffer anzeigen
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Gesteuerte Stufe, Start auf voller Höhe (deckend)</h3>
        <p role="status" className="text-small text-ink-muted">
          Aktuelle Stufe: {detent === "full" ? "voll" : "halb"}
        </p>
        <div>
          <Sheet onOpenChange={(open) => (open ? setDetent("full") : undefined)}>
            <SheetTrigger asChild>
              <Button>Beispielkontakt öffnen</Button>
            </SheetTrigger>
            <SheetContent title="Beispielstudio kontaktieren" closeLabel="Kontakt schliessen" handleLabel="Höhe des Kontakts umschalten" detent={detent} onDetentChange={setDetent}>
              <p className="text-body">Schreib dem Beispielstudio eine Nachricht oder sende eine Terminanfrage.</p>
              <div className="mt-4 flex flex-col gap-2">
                <Button variant="primary" width="full">
                  Terminanfrage senden
                </Button>
                <Button width="full" onClick={() => setDetent(detent === "full" ? "half" : "full")}>
                  {detent === "full" ? "Auf halbe Höhe verkleinern" : "Auf volle Höhe vergrössern"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Titel visuell versteckt</h3>
        <div>
          <Sheet>
            <SheetTrigger asChild>
              <Button>Beispielkarte öffnen</Button>
            </SheetTrigger>
            <SheetContent hideTitle title="Beispielkarte" closeLabel="Karte schliessen" handleLabel="Höhe der Karte umschalten">
              <p className="text-body">Der Titel wird nur vorgelesen. Die Griffleiste und der Schliessen-Button bleiben sichtbar.</p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  );
}
