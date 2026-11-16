"use client";

import { Button, IconButton, UiLink } from "@app/ui";
import { Bell, Bookmark, Download, Pencil, Send, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionsMenuDemo } from "./actions-menu-demo";

const buttonVariants = [
  { variant: "primary", label: "Anfrage senden" },
  { variant: "secondary", label: "Entwurf speichern" },
  { variant: "quiet", label: "Vorschau anzeigen" },
  { variant: "destructive", label: "Beispielprofil löschen" },
] as const;

/** Testseite der Gruppe «Aktionen»: jede Komponente in allen Zuständen. */
export function ActionsSection() {
  const [saved, setSaved] = useState(false);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Button</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Ruhe</h3>
          <div className="flex flex-wrap gap-3">
            {buttonVariants.map(({ variant, label }) => (
              <Button key={variant} variant={variant}>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Deaktiviert</h3>
          <div className="flex flex-wrap gap-3">
            {buttonVariants.map(({ variant, label }) => (
              <Button key={variant} variant={variant} disabled>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Lädt</h3>
          <div className="flex flex-wrap gap-3">
            {buttonVariants.map(({ variant, label }) => (
              <Button key={variant} variant={variant} loading>
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Mit Icon</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" icon={<Send aria-hidden strokeWidth={1.5} />}>
              Nachricht senden
            </Button>
            <Button icon={<Download aria-hidden strokeWidth={1.5} />}>Beispielrechnung herunterladen</Button>
            <Button variant="quiet" icon={<Pencil aria-hidden strokeWidth={1.5} />}>
              Beispieltext bearbeiten
            </Button>
            <Button variant="destructive" icon={<Trash2 aria-hidden strokeWidth={1.5} />}>
              Beispielfoto löschen
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Volle Breite und langer Text</h3>
          <div className="flex max-w-80 flex-col gap-3">
            <Button variant="primary" width="full">
              Terminanfrage an Beispielstudio Musterstadt verbindlich senden
            </Button>
            <Button width="full">Entwurf speichern</Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Als Link</h3>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <UiLink href="#button-als-link">Beispielprofil ansehen</UiLink>
            </Button>
            <Button asChild variant="quiet">
              <UiLink href="#button-als-link">Hilfeartikel lesen</UiLink>
            </Button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">IconButton</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Varianten</h3>
          <div className="flex flex-wrap gap-3">
            <IconButton label="Beispielprofil teilen" icon={<Share2 strokeWidth={1.5} />} />
            <IconButton variant="outlined" label="Beispieltext bearbeiten" icon={<Pencil strokeWidth={1.5} />} />
            <IconButton variant="primary" label="Nachricht senden" icon={<Send strokeWidth={1.5} />} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Deaktiviert</h3>
          <div className="flex flex-wrap gap-3">
            <IconButton disabled label="Beispielprofil teilen" icon={<Share2 strokeWidth={1.5} />} />
            <IconButton disabled variant="outlined" label="Beispieltext bearbeiten" icon={<Pencil strokeWidth={1.5} />} />
            <IconButton disabled variant="primary" label="Nachricht senden" icon={<Send strokeWidth={1.5} />} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Umschalter und Zähler</h3>
          <div className="flex flex-wrap items-center gap-3">
            <IconButton
              aria-pressed={saved}
              label={saved ? "Beispielprofil aus der Sammlung entfernen" : "Beispielprofil in der Sammlung speichern"}
              icon={<Bookmark strokeWidth={1.5} fill={saved ? "currentColor" : "none"} />}
              onClick={() => setSaved((current) => !current)}
            />
            <IconButton label="Mitteilungen anzeigen" badge={3} icon={<Bell strokeWidth={1.5} />} />
            <IconButton label="Mitteilungen anzeigen" badge={128} icon={<Bell strokeWidth={1.5} />} />
          </div>
        </div>
      </section>

      <ActionsMenuDemo />
    </div>
  );
}
