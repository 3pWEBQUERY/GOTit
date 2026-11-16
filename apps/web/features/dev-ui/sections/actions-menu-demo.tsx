"use client";

import {
  Button,
  FloatingAction,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  SplitButton,
  UiLink,
} from "@app/ui";
import { Archive, Copy, Ellipsis, ExternalLink, MessageCircle, Pause, Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";

type OnAction = (action: string) => void;

/** SplitButton, Menu und FloatingAction der Testseite «Aktionen». */
export function ActionsMenuDemo() {
  const [lastAction, setLastAction] = useState("Noch keine Aktion gewählt");
  return (
    <>
      <SplitButtonDemo lastAction={lastAction} setLastAction={setLastAction} />
      <MenuDemo setLastAction={setLastAction} />
      <FloatingActionDemo />
    </>
  );
}

function SplitButtonDemo({ lastAction, setLastAction }: { lastAction: string; setLastAction: OnAction }) {
  const saveOptions = (
    <>
      <MenuItem onSelect={() => setLastAction("Speichern und schliessen")}>Speichern und schliessen</MenuItem>
      <MenuItem onSelect={() => setLastAction("Als Vorlage speichern")}>Als Vorlage speichern</MenuItem>
    </>
  );

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">SplitButton</h2>
      <p role="status" className="text-small text-ink-muted">
        Zuletzt gewählt: {lastAction}
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Ruhe</h3>
        <div className="flex flex-wrap gap-3">
          <SplitButton
            variant="primary"
            menuLabel="Weitere Optionen zum Veröffentlichen öffnen"
            menu={saveOptions}
            onClick={() => setLastAction("Beispielprofil veröffentlichen")}
          >
            Beispielprofil veröffentlichen
          </SplitButton>
          <SplitButton menuLabel="Weitere Optionen zum Speichern öffnen" menu={saveOptions} onClick={() => setLastAction("Entwurf speichern")}>
            Entwurf speichern
          </SplitButton>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Lädt und deaktiviert</h3>
        <div className="flex flex-wrap gap-3">
          <SplitButton loading variant="primary" menuLabel="Weitere Optionen zum Veröffentlichen öffnen" menu={saveOptions}>
            Beispielprofil veröffentlichen
          </SplitButton>
          <SplitButton disabled menuLabel="Weitere Optionen zum Speichern öffnen" menu={saveOptions}>
            Entwurf speichern
          </SplitButton>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Volle Breite</h3>
        <div className="max-w-80">
          <SplitButton width="full" menuLabel="Weitere Optionen zum Speichern öffnen" menu={saveOptions} onClick={() => setLastAction("Entwurf speichern")}>
            Entwurf speichern
          </SplitButton>
        </div>
      </div>
    </section>
  );
}

function MenuDemo({ setLastAction }: { setLastAction: OnAction }) {
  const [showArchived, setShowArchived] = useState(false);
  const [showPaused, setShowPaused] = useState(true);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Menu</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Aktionen, Link, deaktivierter und destruktiver Eintrag</h3>
        <div className="flex flex-wrap gap-3">
          <Menu>
            <MenuTrigger asChild>
              <Button>Profilaktionen öffnen</Button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>Beispielprofil</MenuLabel>
              <MenuItem icon={<Pencil aria-hidden strokeWidth={1.5} />} onSelect={() => setLastAction("Profil bearbeiten")}>
                Profil bearbeiten
              </MenuItem>
              <MenuItem icon={<Copy aria-hidden strokeWidth={1.5} />} onSelect={() => setLastAction("Profil duplizieren")}>
                Profil duplizieren
              </MenuItem>
              <MenuItem asChild>
                <UiLink href="#menu-als-link">
                  <ExternalLink aria-hidden strokeWidth={1.5} />
                  Öffentliche Ansicht öffnen
                </UiLink>
              </MenuItem>
              <MenuItem disabled icon={<Pause aria-hidden strokeWidth={1.5} />}>
                Profil pausieren (nur für Inhaber)
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Archive aria-hidden strokeWidth={1.5} />} onSelect={() => setLastAction("Profil archivieren")}>
                Profil archivieren
              </MenuItem>
              <MenuItem destructive icon={<Trash2 aria-hidden strokeWidth={1.5} />} onSelect={() => setLastAction("Profil löschen")}>
                Profil löschen
              </MenuItem>
            </MenuContent>
          </Menu>

          <Menu>
            <MenuTrigger asChild>
              <IconButton variant="outlined" label="Zeilenaktionen öffnen" icon={<Ellipsis strokeWidth={1.5} />} />
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem onSelect={() => setLastAction("Beispielbuchung ansehen")}>Beispielbuchung ansehen</MenuItem>
              <MenuItem onSelect={() => setLastAction("Beispielbuchung verschieben")}>Beispielbuchung verschieben</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Einträge zum An- und Abwählen</h3>
        <div>
          <Menu>
            <MenuTrigger asChild>
              <Button>Ansicht anpassen</Button>
            </MenuTrigger>
            <MenuContent>
              <MenuLabel>In der Liste zeigen</MenuLabel>
              <MenuCheckboxItem checked={showPaused} onCheckedChange={setShowPaused}>
                Pausierte Profile
              </MenuCheckboxItem>
              <MenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                Archivierte Profile
              </MenuCheckboxItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </section>
  );
}

function FloatingActionDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FloatingAction</h2>
      <p className="max-w-prose text-small text-ink-muted">
        Schwebende Aktionen gehören zur mobilen Shell. Hier stehen sie über einer neutralen Fläche, die den Inhalt darunter vertritt.
      </p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit Beschriftung</h3>
        <div className="flex flex-wrap gap-3 rounded-card bg-surface-2 p-6">
          <FloatingAction variant="primary" label="Kontakt aufnehmen" icon={<MessageCircle strokeWidth={1.5} />} />
          <FloatingAction label="Filter anzeigen" icon={<SlidersHorizontal strokeWidth={1.5} />} />
          <FloatingAction disabled label="Filter anzeigen" icon={<SlidersHorizontal strokeWidth={1.5} />} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Nur Icon</h3>
        <div className="flex flex-wrap gap-3 rounded-card bg-surface-2 p-6">
          <FloatingAction iconOnly variant="primary" label="Beitrag erstellen" icon={<Plus strokeWidth={1.5} />} />
          <FloatingAction iconOnly label="Filter anzeigen" icon={<SlidersHorizontal strokeWidth={1.5} />} />
          <FloatingAction iconOnly disabled label="Filter anzeigen" icon={<SlidersHorizontal strokeWidth={1.5} />} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Als Link, vom Aufrufer positioniert</h3>
        <div className="relative h-48 rounded-card bg-surface-2">
          <FloatingAction
            href="#floating-als-link"
            variant="primary"
            label="Beispielstudio anschreiben"
            icon={<MessageCircle strokeWidth={1.5} />}
            className="absolute right-4 bottom-4"
          />
        </div>
      </div>
    </section>
  );
}
