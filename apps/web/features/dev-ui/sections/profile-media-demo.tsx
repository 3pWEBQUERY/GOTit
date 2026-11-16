"use client";

import { Button, Lightbox, MediaGallery, type MediaItem } from "@app/ui";
import { Flag } from "lucide-react";
import { useState } from "react";

const media: MediaItem[] = [
  { key: "1", alt: "Beispielmedium 1 von Beispielname", initials: "B1" },
  { key: "2", alt: "Beispielmedium 2 von Beispielname", initials: "B2" },
  { key: "3", alt: "Beispielmedium 3 von Beispielname", locked: { reason: "Für angemeldete Mitglieder" } },
  { key: "4", alt: "Beispielmedium 4 von Beispielname", initials: "B4" },
  { key: "5", alt: "Beispielmedium 5 von Beispielname", locked: { reason: "Für angemeldete Mitglieder" } },
  { key: "6", alt: "Beispielmedium 6 von Beispielname", initials: "B6" },
  { key: "7", alt: "Beispielmedium 7 von Beispielname", initials: "B7" },
];

const counter = (current: number, total: number) => `${current} / ${total}`;

/** MediaGallery und Lightbox der Testseite «Profil». Alle Medien sind neutrale oder gesperrte Flächen. */
export function ProfileMediaDemo() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [reported, setReported] = useState("Noch kein Medium gemeldet");

  function openAt(next: number) {
    setIndex(next);
    setOpen(true);
  }

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">MediaGallery</h2>
        <p className="max-w-prose text-small text-ink-muted">
          Unter 768 px ist die Galerie eine wischbare Reihe mit Zähler, darüber ein grosses Medium mit vier Vorschauen. Ein Klick öffnet die Lightbox.
        </p>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mehrere Medien, zwei davon gesperrt</h3>
          <div className="max-w-reading">
            <MediaGallery label="Medien von Beispielname" items={media} onOpen={openAt} allLabel={`Alle ${media.length} Medien ansehen`} counterLabel={counter} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ein einzelnes Medium</h3>
          <div className="max-w-80">
            <MediaGallery label="Medien von Beispielname Zwei" items={media.slice(0, 1)} onOpen={openAt} counterLabel={counter} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Nur gesperrte Medien</h3>
          <div className="max-w-80">
            <MediaGallery label="Medien von Beispielname Drei" items={[{ key: "x", alt: "Beispielmedium", locked: { reason: "Für angemeldete Mitglieder" } }]} onOpen={() => undefined} counterLabel={counter} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Lightbox</h2>
        <p className="max-w-prose text-small text-ink-muted">Pfeil links und rechts wechseln das Medium, Escape schliesst die Ansicht.</p>
        <p role="status" className="text-small text-ink-muted">
          {reported}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => openAt(0)}>Beispielmedien öffnen</Button>
          <Button onClick={() => openAt(2)}>Gesperrtes Beispielmedium öffnen</Button>
        </div>
        <Lightbox
          open={open}
          onOpenChange={setOpen}
          items={media}
          index={index}
          onIndexChange={setIndex}
          labels={{ title: "Medien von Beispielname", close: "Medienansicht schliessen", previous: "Vorheriges Medium zeigen", next: "Nächstes Medium zeigen" }}
          counterLabel={counter}
          actions={(item) => (
            <Button
              variant="quiet"
              icon={<Flag aria-hidden strokeWidth={1.5} />}
              onClick={() => {
                setReported(`Zuletzt gemeldet: ${item.alt}`);
                setOpen(false);
              }}
            >
              Medium melden
            </Button>
          )}
        />
      </section>
    </>
  );
}
