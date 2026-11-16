"use client";

import {
  BookingRequestCard,
  Composer,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  MessageThread,
  TemplatePicker,
  type MessageTemplate,
  type ThreadEntry,
} from "@app/ui";
import { Ellipsis, Flag } from "lucide-react";
import { useState } from "react";

const templates: MessageTemplate[] = [
  { key: "hello", title: "Beispielvorlage Begrüssung", text: "Beispieltext einer Vorlage: Danke für deine Nachricht." },
  { key: "busy", title: "Beispielvorlage Absage", text: "Beispieltext einer Vorlage: An diesem Tag bin ich leider nicht verfügbar." },
];

const statusLabels = { sending: "Wird gesendet", sent: "Gesendet", read: "Gelesen", failed: "Nicht gesendet" };
const composerHint = "Enter sendet, Umschalt + Enter fügt eine Zeile ein";

function messageMenu(onReport: () => void) {
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton label="Aktionen zur Nachricht öffnen" icon={<Ellipsis strokeWidth={1.5} />} />
      </MenuTrigger>
      <MenuContent>
        <MenuItem icon={<Flag aria-hidden strokeWidth={1.5} />} onSelect={onReport}>
          Nachricht melden
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

/** MessageThread, Composer und TemplatePicker der Testseite «Kommunikation». */
export function CommunicationThreadDemo() {
  const [note, setNote] = useState("Noch keine Aktion gewählt");
  const [draft, setDraft] = useState("");
  const [blockedDraft, setBlockedDraft] = useState("Beispieltext, der vor dem Blockieren geschrieben wurde");
  const [glassDraft, setGlassDraft] = useState("");
  const [sent, setSent] = useState<ThreadEntry[]>([]);
  const [failedStatus, setFailedStatus] = useState<"failed" | "sending" | "sent">("failed");

  const entries: ThreadEntry[] = [
    { type: "date", key: "d1", label: "Gestern" },
    { type: "message", key: "m1", own: false, text: "Beispieltext einer Nachricht", time: "17:40", menu: messageMenu(() => setNote("Nachricht melden")) },
    { type: "message", key: "m2", own: true, text: "Beispieltext einer Antwort", time: "17:42", status: "read" },
    { type: "date", key: "d2", label: "Heute" },
    {
      type: "card",
      key: "c1",
      content: (
        <BookingRequestCard
          title="Terminanfrage von Beispielname"
          details={[
            { key: "date", label: "Datum", value: "Do, 19.11.2026" },
            { key: "time", label: "Uhrzeit", value: "18:00" },
          ]}
          status={{ kind: "pending", label: "Offen" }}
          labels={{ accept: "Anfrage zusagen", counter: "Gegenvorschlag senden", decline: "Anfrage ablehnen" }}
          onAccept={() => setNote("Anfrage zusagen")}
          onCounter={() => setNote("Gegenvorschlag senden")}
          onDecline={() => setNote("Anfrage ablehnen")}
        />
      ),
    },
    { type: "message", key: "m3", own: true, text: "Beispieltext, der gesendet wurde", time: "14:02", status: "sent" },
    { type: "message", key: "m4", own: true, text: "Beispieltext, der gerade gesendet wird", time: "14:03", status: "sending" },
    { type: "message", key: "m5", own: true, text: "Beispieltext, dessen Zustellung zuerst fehlschlägt", time: "14:04", status: failedStatus },
    ...sent,
  ];

  function send() {
    const text = draft.trim();
    setSent((current) => [...current, { type: "message", key: `sent-${current.length}`, own: true, text, time: "Jetzt", status: "sent" }]);
    setDraft("");
  }

  function retry() {
    setFailedStatus("sending");
    window.setTimeout(() => setFailedStatus("sent"), 1200);
  }

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">MessageThread</h2>
        <p role="status" className="text-small text-ink-muted">
          Zuletzt gewählt: {note}
        </p>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Verlauf mit Trenner, Karte und allen Zustellstatus</h3>
          <div className="flex max-w-reading flex-col gap-4 rounded-card border border-border p-4">
            <MessageThread
              label="Unterhaltung mit Beispielname"
              entries={entries}
              authorLabels={{ own: "Du", other: "Beispielname" }}
              statusLabels={statusLabels}
              retryLabel="Nachricht erneut senden"
              onRetry={retry}
            />
            <Composer
              value={draft}
              onValueChange={setDraft}
              onSend={send}
              label="Nachricht an Beispielname"
              placeholder="Nachricht schreiben"
              sendLabel="Nachricht senden"
              hint={composerHint}
              leading={<TemplatePicker iconOnly label="Vorlage einfügen" templates={templates} emptyText="Du hast noch keine Vorlagen angelegt." onSelect={(template) => setDraft(template.text)} />}
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Composer</h2>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Gesperrt mit Begründung, der Text bleibt erhalten</h3>
          <Composer
            className="max-w-reading"
            value={blockedDraft}
            onValueChange={setBlockedDraft}
            onSend={() => undefined}
            label="Nachricht an Beispielname Zwei"
            sendLabel="Nachricht senden"
            hint={composerHint}
            disabled
            disabledReason="Du hast Beispielname Zwei blockiert. Hebe die Blockierung auf, um wieder zu schreiben."
          />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Glas für den mobilen Messenger</h3>
          <p className="max-w-prose text-small text-ink-muted">
            Unter 768 px ist der Composer am unteren Rand fixiert und aus Glas; hier hält ihn eine neutrale Fläche fest. Ab 768 px steht er deckend im Fluss.
          </p>
          <div className="relative flex h-48 max-w-reading flex-col justify-end overflow-hidden rounded-card bg-surface-2 [contain:layout] md:p-4">
            <Composer glass value={glassDraft} onValueChange={setGlassDraft} onSend={() => setGlassDraft("")} label="Nachricht an Beispielname Drei" placeholder="Nachricht schreiben" sendLabel="Nachricht senden" />
          </div>
        </div>
      </section>

      <TemplatePickerDemo onSelect={(template) => setDraft(template.text)} />
    </>
  );
}

function TemplatePickerDemo({ onSelect }: { onSelect: (template: MessageTemplate) => void }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">TemplatePicker</h2>
      <p className="max-w-prose text-small text-ink-muted">Die gewählte Vorlage landet im Composer des Verlaufs oben und bleibt dort editierbar. Gesendet wird nichts.</p>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit Beschriftung, nur Icon, deaktiviert</h3>
        <div className="flex flex-wrap gap-3">
          <TemplatePicker label="Vorlage einfügen" templates={templates} emptyText="Du hast noch keine Vorlagen angelegt." onSelect={onSelect} />
          <TemplatePicker iconOnly label="Vorlage einfügen" templates={templates} emptyText="Du hast noch keine Vorlagen angelegt." onSelect={onSelect} />
          <TemplatePicker disabled label="Vorlage einfügen" templates={templates} emptyText="Du hast noch keine Vorlagen angelegt." onSelect={() => undefined} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Ohne Vorlagen</h3>
        <div>
          <TemplatePicker label="Vorlage einfügen" templates={[]} emptyText="Du hast noch keine Vorlagen angelegt." onSelect={() => undefined} />
        </div>
      </div>
    </section>
  );
}
