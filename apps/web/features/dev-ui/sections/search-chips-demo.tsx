"use client";

import { Button, FilterBar, FilterBarButton, FilterChip } from "@app/ui";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

const quickFilters = ["Heute verfügbar", "Identität geprüft", "Mit Video", "Deutsch", "Französisch", "Hausbesuch", "Neu in Beispielstadt"];

const initialActive = ["Heute", "Deutsch", "Umkreis 10 km"];

/** FilterChip und FilterBar der Testseite «Suche». */
export function SearchChipsDemo() {
  return (
    <>
      <FilterChipDemo />
      <FilterBarDemo />
    </>
  );
}

function FilterChipDemo() {
  const [today, setToday] = useState(false);
  const [video, setVideo] = useState(true);
  const [active, setActive] = useState(initialActive);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FilterChip</h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Schnellfilter zum Umschalten</h3>
        <div className="flex flex-wrap gap-2">
          <FilterChip pressed={today} onPressedChange={setToday} icon={<CalendarDays aria-hidden strokeWidth={1.5} />}>
            Heute verfügbar
          </FilterChip>
          <FilterChip pressed={video} onPressedChange={setVideo}>
            Mit Video
          </FilterChip>
          <FilterChip pressed={false} onPressedChange={() => undefined} disabled>
            Nicht wählbar
          </FilterChip>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Aktive Filter zum Entfernen</h3>
        <div className="flex flex-wrap gap-2">
          {active.map((filter) => (
            <FilterChip key={filter} variant="removable" removeLabel={`Filter ${filter} entfernen`} onRemove={() => setActive((current) => current.filter((entry) => entry !== filter))}>
              {filter}
            </FilterChip>
          ))}
          <FilterChip variant="removable" removeLabel="Filter Beispielkategorie entfernen" onRemove={() => undefined} disabled>
            Beispielkategorie
          </FilterChip>
        </div>
        <p role="status" className="text-small text-ink-muted">
          {active.length === 0 ? "Kein Beispielfilter ist aktiv." : `Aktive Beispielfilter: ${active.length}`}
        </p>
        <div>
          <Button variant="quiet" onClick={() => setActive(initialActive)}>
            Beispielfilter wiederherstellen
          </Button>
        </div>
      </div>
    </section>
  );
}

function FilterBarDemo() {
  const [pressed, setPressed] = useState<string[]>(["Heute verfügbar"]);
  const toggle = (filter: string, on: boolean) => setPressed((current) => (on ? [...current, filter] : current.filter((entry) => entry !== filter)));

  const chips = quickFilters.map((filter) => (
    <FilterChip key={filter} pressed={pressed.includes(filter)} onPressedChange={(on) => toggle(filter, on)}>
      {filter}
    </FilterChip>
  ));

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FilterBar</h2>
      <p className="max-w-prose text-small text-ink-muted">Die Leiste bricht nicht um. Passen die Chips nicht, scrollt sie horizontal und der letzte Chip ist angeschnitten.</p>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Mit Filter-Button und Anzahl</h3>
        <FilterBar label="Schnellfilter mit Filter-Button" leading={<FilterBarButton count={pressed.length} accessibleLabel={`Filter anzeigen, ${pressed.length} aktiv`}>Filter</FilterBarButton>}>
          {chips}
        </FilterBar>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Nur Chips</h3>
        <FilterBar label="Schnellfilter ohne Filter-Button">{chips}</FilterBar>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h3">Haftend</h3>
        <p className="max-w-prose text-small text-ink-muted">Scrolle im Kasten. Unter 768 px Breite ist die Leiste Glas, darüber deckend mit Linie.</p>
        <div className="h-80 overflow-y-auto rounded-card border border-border">
          <FilterBar sticky label="Haftende Schnellfilter" leading={<FilterBarButton>Filter</FilterBarButton>}>
            {chips}
          </FilterBar>
          <ul className="flex flex-col gap-3 p-4">
            {Array.from({ length: 12 }, (_, index) => (
              <li key={index} className="rounded-control bg-surface-2 p-4 text-small">
                Beispieleintrag {index + 1}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
