"use client";

import { Button, ResultCount, SavedSearchButton, SortMenu, ViewToggle, type SavedSearchState, type ViewMode } from "@app/ui";
import { useEffect, useState } from "react";

const sortOptions = [
  { value: "relevanz", label: "Relevanz" },
  { value: "aktualisiert", label: "Kürzlich aktualisiert" },
  { value: "neu", label: "Neu" },
  { value: "preis", label: "Preis" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

const savedLabels = { idle: "Suche speichern", saving: "Suche wird gespeichert", saved: "Suche gespeichert" };
const viewLabels = { grid: "Raster", list: "Liste" };

/** ResultCount, SortMenu, ViewToggle und SavedSearchButton der Testseite «Suche». */
export function SearchResultsDemo() {
  return (
    <>
      <ResultCountDemo />
      <SortMenuDemo />
      <ViewToggleDemo />
      <SavedSearchButtonDemo />
    </>
  );
}

function ResultCountDemo() {
  const [count, setCount] = useState(48);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">ResultCount</h2>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Als Absatz, wird bei Änderung angesagt</h3>
        <ResultCount>{count === 0 ? "Keine Beispielprofile in Beispielstadt" : `${count} Beispielprofile in Beispielstadt`}</ResultCount>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setCount((current) => Math.max(0, current - 12))}>Trefferzahl senken</Button>
          <Button onClick={() => setCount(48)}>Trefferzahl zurücksetzen</Button>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Als Überschrift</h3>
        <p className="max-w-prose text-small text-ink-muted">Auf der Suchseite ist die Trefferzahl die h1. Hier steht sie als h2-Variante auf der Ebene darunter, weil die Testseite schon eine h1 hat.</p>
        <ResultCount as="h2" className="text-h1">
          48 Beispielprofile in Musterstadt
        </ResultCount>
      </div>
    </section>
  );
}

function SortMenuDemo() {
  const [sort, setSort] = useState<SortValue>("relevanz");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">SortMenu</h2>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Ruhe</h3>
        <div>
          <SortMenu label="Sortierung" options={sortOptions} value={sort} onValueChange={setSort} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Deaktiviert</h3>
        <div>
          <SortMenu label="Sortierung" options={sortOptions} value="neu" onValueChange={() => undefined} disabled />
        </div>
      </div>
    </section>
  );
}

function ViewToggleDemo() {
  const [view, setView] = useState<ViewMode>("grid");
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">ViewToggle</h2>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Ruhe</h3>
        <div className="flex flex-wrap items-center gap-4">
          <ViewToggle label="Ansicht" labels={viewLabels} value={view} onValueChange={setView} />
          <p role="status" className="text-small text-ink-muted">
            Gewählt: {viewLabels[view]}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Deaktiviert</h3>
        <ViewToggle label="Ansicht, nicht änderbar" labels={viewLabels} value="list" onValueChange={() => undefined} disabled />
      </div>
    </section>
  );
}

function SavedSearchButtonDemo() {
  const [state, setState] = useState<SavedSearchState>("idle");

  // Das Beispiel hat keinen Server; nach kurzer Zeit gilt die Suche als gespeichert.
  useEffect(() => {
    if (state !== "saving") return;
    const timer = window.setTimeout(() => setState("saved"), 1200);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">SavedSearchButton</h2>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Im Ablauf</h3>
        <p className="max-w-prose text-small text-ink-muted">Ein Klick speichert die Beispielsuche, ein weiterer entfernt sie wieder.</p>
        <div>
          <SavedSearchButton state={state} labels={savedLabels} onClick={() => setState(state === "saved" ? "idle" : "saving")} />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Alle Zustände</h3>
        <div className="flex flex-wrap gap-3">
          <SavedSearchButton state="idle" labels={savedLabels} onClick={() => undefined} />
          <SavedSearchButton state="saving" labels={savedLabels} onClick={() => undefined} />
          <SavedSearchButton state="saved" labels={savedLabels} onClick={() => undefined} />
          <SavedSearchButton state="idle" labels={savedLabels} onClick={() => undefined} disabled />
        </div>
      </div>
    </section>
  );
}
