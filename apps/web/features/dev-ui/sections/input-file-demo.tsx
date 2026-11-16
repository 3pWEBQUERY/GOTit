"use client";

import { FileDrop, type FileDropItemData, type FileRejectReason } from "@app/ui";
import { useState } from "react";
import { InputDemoBlock } from "./input-demo-block";

const fileLabels = {
  choose: "Dateien wählen",
  queued: "Wartet auf den Upload",
  uploading: (percent: number) => `${percent} % hochgeladen`,
  done: "Hochgeladen",
  retry: "Erneut versuchen",
  remove: (name: string) => `${name} entfernen`,
};

const rejectTexts: Record<FileRejectReason, string> = {
  type: "ist kein Bild und wurde nicht angenommen.",
  size: "ist grösser als 2 MB und wurde nicht angenommen.",
  count: "wurde nicht angenommen, weil hier nur eine Datei möglich ist.",
};

const exampleItems: FileDropItemData[] = [
  { id: "beispiel-1", name: "beispielfoto-eins.jpg", sizeLabel: "1,2 MB", status: "queued" },
  { id: "beispiel-2", name: "beispielfoto-zwei.jpg", sizeLabel: "0,8 MB", status: "uploading", progress: 40 },
  { id: "beispiel-3", name: "beispielfoto-drei.jpg", sizeLabel: "1,9 MB", status: "done" },
  { id: "beispiel-4", name: "beispielfoto-vier.jpg", sizeLabel: "1,1 MB", status: "error", error: "Die Verbindung wurde unterbrochen. Die Datei ist noch ausgewählt." },
];

function sizeLabel(bytes: number): string {
  return `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 1 }).format(bytes / 1_000_000)} MB`;
}

/** FileDrop der Testseite «Eingabe». Die Seite lädt nichts hoch; sie zeigt nur die Zustände. */
export function InputFileDemo() {
  const [items, setItems] = useState<FileDropItemData[]>(exampleItems);
  const [rejected, setRejected] = useState<string | undefined>(undefined);

  const addFiles = (files: File[]) => {
    setRejected(undefined);
    setItems((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), name: file.name, sizeLabel: sizeLabel(file.size), status: "queued" as const }))]);
  };
  const retry = (id: string) => setItems((current) => current.map((item) => (item.id === id ? { ...item, status: "uploading", progress: 0, error: undefined } : item)));
  const remove = (id: string) => setItems((current) => current.filter((item) => item.id !== id));

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FileDrop</h2>
      <InputDemoBlock title="Mit Dateien in allen Zuständen">
        <FileDrop
          label="Beispielfotos"
          dropHint="Zieh Bilder hierher oder wähle sie aus."
          hint="Bilder bis 2 MB. Die Testseite lädt nichts hoch."
          error={rejected}
          labels={fileLabels}
          accept="image/*"
          multiple
          maxSizeBytes={2_000_000}
          items={items}
          onFilesSelected={addFiles}
          onReject={(file, reason) => setRejected(`«${file.name}» ${rejectTexts[reason]}`)}
          onRetry={retry}
          onRemove={remove}
        />
      </InputDemoBlock>
      <InputDemoBlock title="Leer, eine Datei, optional">
        <FileDrop
          label="Beispieldokument"
          optionalLabel="optional"
          dropHint="Zieh ein PDF hierher oder wähle es aus."
          hint="Ein PDF bis 2 MB."
          labels={{ ...fileLabels, choose: "Datei wählen" }}
          accept=".pdf"
          maxSizeBytes={2_000_000}
          items={[]}
          onFilesSelected={() => undefined}
        />
      </InputDemoBlock>
      <InputDemoBlock title="Fehler">
        <FileDrop label="Beispielfotos" hint="Bilder bis 2 MB." error="Lade mindestens ein Foto hoch, um das Profil zu veröffentlichen." labels={fileLabels} accept="image/*" multiple items={[]} onFilesSelected={() => undefined} />
      </InputDemoBlock>
      <InputDemoBlock title="Deaktiviert">
        <FileDrop label="Beispielfotos" dropHint="Nur der Inhaber kann Fotos hochladen." labels={fileLabels} items={[]} onFilesSelected={() => undefined} disabled />
      </InputDemoBlock>
    </section>
  );
}
