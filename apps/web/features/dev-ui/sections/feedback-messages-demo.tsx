"use client";

import { Banner, Button, InlineAlert, useToast } from "@app/ui";
import { useState } from "react";

/** Toast, InlineAlert und Banner der Testseite «Rückmeldung». */
export function FeedbackMessagesDemo() {
  return (
    <>
      <ToastDemo />
      <InlineAlertDemo />
      <BannerDemo />
    </>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  const [archived, setArchived] = useState(false);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Toast</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Töne</h3>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => toast({ title: "Link zum Beispielprofil kopiert" })}>Neutralen Toast zeigen</Button>
          <Button onClick={() => toast({ tone: "success", title: "Beispieltarif gespeichert", description: "Die Änderung ist sofort im Profil sichtbar." })}>
            Erfolg zeigen
          </Button>
          <Button
            onClick={() =>
              toast({ tone: "error", title: "Beispielfoto nicht hochgeladen", description: "Die Datei ist grösser als 20 MB. Dein Entwurf ist unverändert." })
            }
          >
            Fehler zeigen
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit «Rückgängig» (8 Sekunden)</h3>
        <p role="status" className="text-small text-ink-muted">
          Beispielprofil ist {archived ? "archiviert" : "aktiv"}
        </p>
        <div>
          <Button
            disabled={archived}
            onClick={() => {
              setArchived(true);
              toast({
                tone: "success",
                title: "Beispielprofil archiviert",
                action: { label: "Archivieren rückgängig machen", onAction: () => setArchived(false) },
              });
            }}
          >
            Beispielprofil archivieren
          </Button>
        </div>
      </div>
    </section>
  );
}

function InlineAlertDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">InlineAlert</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Töne</h3>
        <div className="flex max-w-reading flex-col gap-3">
          <InlineAlert tone="info" title="Dein Beispielprofil wird geprüft">
            Die Prüfung dauert in der Regel einen Werktag. Du kannst in dieser Zeit weiter bearbeiten.
          </InlineAlert>
          <InlineAlert tone="success" title="Beispieladresse bestätigt">
            Du erhältst Mitteilungen ab jetzt an diese Adresse.
          </InlineAlert>
          <InlineAlert tone="warning" title="Dein Beispielabo endet in 3 Tagen">
            Danach ist das Profil nicht mehr in der Suche sichtbar.
          </InlineAlert>
          <InlineAlert tone="error" title="Beispielzahlung fehlgeschlagen">
            Die Karte wurde abgelehnt. Dein Abo läuft bis zum Monatsende weiter.
          </InlineAlert>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit Aktion und nur mit Titel</h3>
        <div className="flex max-w-reading flex-col gap-3">
          <InlineAlert tone="warning" title="Dein Beispielabo endet in 3 Tagen" action={<Button>Abo verlängern</Button>}>
            Danach ist das Profil nicht mehr in der Suche sichtbar.
          </InlineAlert>
          <InlineAlert tone="info" title="Beispielhinweis ohne weiteren Text" />
        </div>
      </div>
    </section>
  );
}

function BannerDemo() {
  const [closed, setClosed] = useState(false);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Banner</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Töne</h3>
        <div className="flex flex-col gap-3">
          <Banner tone="info">Am Beispieltag von 02:00 bis 03:00 Uhr ist die Plattform wegen Wartung nicht erreichbar.</Banner>
          <Banner tone="success">Die Verbindung ist wieder da. Deine Beispielnachricht wurde gesendet.</Banner>
          <Banner tone="warning">Du bist offline. Ungesendete Nachrichten bleiben im Eingabefeld.</Banner>
          <Banner tone="error">Die Beispielzahlung ist fehlgeschlagen. Dein Profil bleibt bis zum Monatsende sichtbar.</Banner>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit Aktion</h3>
        <Banner tone="warning" action={<Button>Verbindung prüfen</Button>}>
          Du bist offline. Ungesendete Nachrichten bleiben im Eingabefeld.
        </Banner>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Schliessbar</h3>
        {closed ? (
          <div>
            <Button onClick={() => setClosed(false)}>Banner wieder anzeigen</Button>
          </div>
        ) : (
          <Banner tone="info" action={<Button variant="quiet">Beispielneuerungen ansehen</Button>} onClose={() => setClosed(true)} closeLabel="Hinweis schliessen">
            Der Beispielkalender zeigt jetzt auch Touren.
          </Banner>
        )}
      </div>
    </section>
  );
}
