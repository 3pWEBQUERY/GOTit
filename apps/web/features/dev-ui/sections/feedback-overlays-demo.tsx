"use client";

import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  IconButton,
  InlineAlert,
  SidePanel,
  SidePanelClose,
  SidePanelContent,
  SidePanelTrigger,
  Tooltip,
  useToast,
} from "@app/ui";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { FeedbackSheetDemo } from "./feedback-sheet-demo";

/** Dialog, ConfirmDialog, Sheet, SidePanel und Tooltip der Testseite «Rückmeldung». */
export function FeedbackOverlaysDemo() {
  return (
    <>
      <DialogDemo />
      <ConfirmDialogDemo />
      <FeedbackSheetDemo />
      <SidePanelDemo />
      <TooltipDemo />
    </>
  );
}

function DialogDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Dialog</h2>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Beispielprofil pausieren</Button>
          </DialogTrigger>
          <DialogContent
            title="Beispielprofil pausieren?"
            description="Das Profil ist nicht mehr in der Suche sichtbar. Offene Terminanfragen bleiben bestehen. Du kannst es jederzeit wieder aktivieren."
            closeLabel="Dialog schliessen"
          >
            <DialogFooter>
              <DialogClose asChild>
                <Button>Profil sichtbar lassen</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="primary">Profil pausieren</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Dialog ohne Beschreibung öffnen</Button>
          </DialogTrigger>
          <DialogContent title="Beispielsammlung umbenennen" closeLabel="Dialog schliessen">
            <p className="text-small text-ink-muted">Hier steht ein kurzes Formular mit einem Feld.</p>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Umbenennen abbrechen</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="primary">Sammlung umbenennen</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function ConfirmDialogDemo() {
  const { toast } = useToast();
  const [failed, setFailed] = useState(false);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">ConfirmDialog</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Sofort, mit Ladezustand und mit Fehler</h3>
        <div className="flex flex-wrap gap-3">
          <ConfirmDialog
            trigger={<Button variant="destructive">Beispielfoto löschen</Button>}
            title="Dieses Beispielfoto endgültig löschen?"
            description="Das Foto wird aus deinem Profil und aus allen Beiträgen entfernt. Das lässt sich nicht rückgängig machen."
            confirmLabel="Foto endgültig löschen"
            cancelLabel="Foto behalten"
            onConfirm={() => {
              toast({ tone: "success", title: "Beispielfoto gelöscht" });
            }}
          />
          <ConfirmDialog
            trigger={<Button>Beispielverknüpfung lösen</Button>}
            title="Verknüpfung mit dem Beispielstudio lösen?"
            description="Dein Profil erscheint nicht mehr auf der Seite des Studios. Für eine neue Verknüpfung braucht es eine neue Einladung."
            confirmLabel="Verknüpfung lösen"
            cancelLabel="Verknüpfung behalten"
            onConfirm={async () => {
              await wait(1500);
              toast({ tone: "success", title: "Beispielverknüpfung gelöst" });
            }}
          />
          <ConfirmDialog
            trigger={<Button>Beispielkonto löschen</Button>}
            onOpenChange={(open) => {
              if (!open) setFailed(false);
            }}
            title="Dein Beispielkonto endgültig löschen?"
            description="Profile, Nachrichten und Rechnungen werden gelöscht. Das lässt sich nicht rückgängig machen."
            confirmLabel="Konto endgültig löschen"
            cancelLabel="Konto behalten"
            onConfirm={async () => {
              setFailed(false);
              await wait(1000);
              setFailed(true);
              throw new Error("Beispielfehler der Testseite");
            }}
          >
            {failed ? (
              <InlineAlert tone="error" title="Das Konto wurde nicht gelöscht">
                Der Beispielserver hat nicht geantwortet. Es wurde nichts verändert. Versuch es noch einmal.
              </InlineAlert>
            ) : null}
          </ConfirmDialog>
        </div>
      </div>
    </section>
  );
}

function SidePanelDemo() {
  const paragraphs = Array.from({ length: 12 }, (_, index) => `Beispielabschnitt ${index + 1} des Formulars. Der Körper des Panels scrollt, Kopf und Fuss bleiben stehen.`);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">SidePanel</h2>
      <div className="flex flex-wrap gap-3">
        <SidePanel>
          <SidePanelTrigger asChild>
            <Button>Beispieltarif bearbeiten</Button>
          </SidePanelTrigger>
          <SidePanelContent
            title="Beispieltarif bearbeiten"
            description="Änderungen gelten für neue Terminanfragen."
            closeLabel="Panel schliessen"
            footer={
              <>
                <SidePanelClose asChild>
                  <Button>Änderungen verwerfen</Button>
                </SidePanelClose>
                <SidePanelClose asChild>
                  <Button variant="primary">Tarif speichern</Button>
                </SidePanelClose>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              {paragraphs.map((text) => (
                <p key={text} className="text-body">
                  {text}
                </p>
              ))}
            </div>
          </SidePanelContent>
        </SidePanel>

        <SidePanel>
          <SidePanelTrigger asChild>
            <Button>Panel ohne Fuss öffnen</Button>
          </SidePanelTrigger>
          <SidePanelContent title="Beispielbuchung ansehen" closeLabel="Panel schliessen">
            <p className="text-body">Hier stehen die Angaben der Beispielbuchung. Ohne Fuss gibt es nichts zu speichern.</p>
          </SidePanelContent>
        </SidePanel>
      </div>
    </section>
  );
}

function TooltipDemo() {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">Tooltip</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Bei Hover und Fokus</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Tooltip content="01.01.2030, 14:05 Uhr">
            <button type="button" className="min-h-11 rounded-chip text-small text-ink-muted underline decoration-dotted underline-offset-4">
              vor 3 Tagen
            </button>
          </Tooltip>
          <Tooltip content="Die Antwortzeit ist der Mittelwert der letzten 30 Tage." side="right">
            <IconButton label="Erklärung zur Antwortzeit anzeigen" icon={<CircleHelp strokeWidth={1.5} />} />
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Geöffnet</h3>
        <div className="pb-8">
          <Tooltip open content="Dieser Tooltip ist dauerhaft geöffnet." side="bottom">
            <Button variant="quiet">Beispielauslöser fokussieren</Button>
          </Tooltip>
        </div>
      </div>
    </section>
  );
}
