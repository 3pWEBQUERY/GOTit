"use client";

import { AvailabilityBadge, Button, ContactBar } from "@app/ui";
import { Bookmark, Flag, Share2 } from "lucide-react";
import { useState } from "react";

const request = { label: "Termin anfragen", href: "#termin-anfragen" };

/** ContactBar der Testseite «Profil»: haftende Spalte und mobile Leiste, jeweils auch pausiert. */
export function ProfileContactDemo() {
  const [lastAction, setLastAction] = useState("Noch keine Aktion gewählt");
  const message = { label: "Nachricht schreiben", onClick: () => setLastAction("Nachricht schreiben") };

  const save = (
    <Button variant="quiet" icon={<Bookmark aria-hidden strokeWidth={1.5} />} onClick={() => setLastAction("Profil speichern")}>
      Profil speichern
    </Button>
  );
  const share = (
    <Button variant="quiet" icon={<Share2 aria-hidden strokeWidth={1.5} />} onClick={() => setLastAction("Profil teilen")}>
      Profil teilen
    </Button>
  );
  const report = (
    <Button variant="quiet" icon={<Flag aria-hidden strokeWidth={1.5} />} onClick={() => setLastAction("Profil melden")}>
      Profil melden
    </Button>
  );

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">ContactBar</h2>
      <p role="status" className="text-small text-ink-muted">
        Zuletzt gewählt: {lastAction}
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Haftende Spalte</h3>
        <div className="max-w-80">
          <ContactBar variant="sticky-panel" className="md:static" label="Kontakt zu Beispielname" request={request} message={message} save={save} share={share} report={report}>
            <AvailabilityBadge label="Heute 14–22 Uhr" />
          </ContactBar>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Haftende Spalte, Profil pausiert</h3>
        <div className="max-w-80">
          <ContactBar
            variant="sticky-panel"
            className="md:static"
            label="Kontakt zu Beispielname Zwei"
            request={request}
            message={message}
            save={save}
            report={report}
            paused="Dieses Profil ist zurzeit pausiert"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mobile Leiste</h3>
        <p className="max-w-prose text-small text-ink-muted">
          Die Leiste erscheint nur unter 768 px Breite. Sie ist am unteren Rand fixiert; hier hält sie eine neutrale Fläche fest, die den Inhalt darunter vertritt.
        </p>
        <div className="relative h-32 overflow-hidden rounded-card bg-surface-2 [contain:layout]">
          <ContactBar variant="mobile-bar" label="Kontakt zu Beispielname, mobil" request={request} message={message} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mobile Leiste, Profil pausiert</h3>
        <div className="relative h-32 overflow-hidden rounded-card bg-surface-2 [contain:layout]">
          <ContactBar variant="mobile-bar" label="Kontakt zu Beispielname Zwei, mobil" request={request} message={message} paused="Dieses Profil ist zurzeit pausiert" />
        </div>
      </div>
    </section>
  );
}
