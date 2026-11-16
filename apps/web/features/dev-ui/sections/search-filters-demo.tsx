"use client";

import { Checkbox, FilterBarButton, FilterGroup, FilterPanel, FilterSheet, RadioGroup, Select, Slider } from "@app/ui";
import { useState } from "react";

const availabilityOptions = [
  { value: "alle", label: "Jederzeit" },
  { value: "jetzt", label: "Jetzt" },
  { value: "heute", label: "Heute" },
];

const cantons = [
  { value: "beispielkanton", label: "Beispielkanton" },
  { value: "musterkanton", label: "Musterkanton" },
];

interface Filters {
  /** Leer heisst: kein Kanton gewählt. */
  canton: string;
  radius: number;
  availability: string;
  identity: boolean;
  photos: boolean;
  video: boolean;
}

const emptyFilters: Filters = { canton: "", radius: 25, availability: "alle", identity: false, photos: false, video: false };

function countActive(filters: Filters): number {
  return [filters.canton !== "", filters.radius !== 25, filters.availability !== "alle", filters.identity, filters.photos, filters.video].filter(Boolean).length;
}

/** Erfundene Trefferzahl, damit sich die Zahl im Beispiel sichtbar ändert. */
function exampleCount(filters: Filters): number {
  return Math.max(0, 48 - countActive(filters) * 9);
}

function FilterFields({ filters, onChange, prefix }: { filters: Filters; onChange: (next: Filters) => void; prefix: string }) {
  const trustSummary = [filters.identity && "Identität geprüft", filters.photos && "Fotos geprüft"].filter(Boolean).join(", ");
  return (
    <>
      <FilterGroup title="Standort" summary={filters.canton ? `${cantons.find((canton) => canton.value === filters.canton)?.label ?? ""}, ${filters.radius} km` : undefined}>
        <Select label="Kanton" placeholder="Kanton wählen" options={cantons} value={filters.canton} onValueChange={(canton) => onChange({ ...filters, canton })} />
        <Slider label="Umkreis" min={5} max={100} step={5} value={filters.radius} formatValue={(value) => `${value} km`} onValueChange={(radius) => onChange({ ...filters, radius })} hint="Gemessen ab dem Ortsmittelpunkt." />
      </FilterGroup>
      <FilterGroup title="Verfügbarkeit" summary={filters.availability === "alle" ? undefined : availabilityOptions.find((option) => option.value === filters.availability)?.label}>
        <RadioGroup label="Zeitpunkt" name={`${prefix}-zeitpunkt`} options={availabilityOptions} value={filters.availability} onValueChange={(availability) => onChange({ ...filters, availability })} />
      </FilterGroup>
      <FilterGroup title="Vertrauen" summary={trustSummary || undefined}>
        <div className="flex flex-col">
          <Checkbox label="Identität geprüft" checked={filters.identity} onCheckedChange={(checked) => onChange({ ...filters, identity: checked === true })} />
          <Checkbox label="Fotos geprüft" checked={filters.photos} onCheckedChange={(checked) => onChange({ ...filters, photos: checked === true })} />
        </div>
      </FilterGroup>
      <FilterGroup title="Inhalte" collapsible={false}>
        <Checkbox label="Mit Video" checked={filters.video} onCheckedChange={(checked) => onChange({ ...filters, video: checked === true })} />
      </FilterGroup>
    </>
  );
}

/** FilterPanel und FilterSheet der Testseite «Suche». */
export function SearchFiltersDemo() {
  return (
    <>
      <FilterPanelDemo />
      <FilterSheetDemo />
    </>
  );
}

function FilterPanelDemo() {
  const [filters, setFilters] = useState(emptyFilters);
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FilterPanel</h2>
      <p className="max-w-prose text-small text-ink-muted">Seitenleiste von 280 px für den Desktop. Filter wirken dort sofort; die Trefferzahl daneben ist ein Beispielwert.</p>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <FilterPanel title="Filter" titleAs="h3" resetLabel="Alle zurücksetzen" resetDisabled={countActive(filters) === 0} onReset={() => setFilters(emptyFilters)}>
          <FilterFields filters={filters} onChange={setFilters} prefix="panel" />
        </FilterPanel>
        <p role="status" className="tabular text-body">
          {exampleCount(filters)} Beispielprofile, {countActive(filters)} Filter aktiv
        </p>
      </div>
    </section>
  );
}

function FilterSheetDemo() {
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const count = exampleCount(draft);

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">FilterSheet</h2>
      <p className="max-w-prose text-small text-ink-muted">Für Mobile: volle Höhe, deckend. Die Filter wirken erst über den Button im Fuss; seine Zahl ändert sich mit jeder Auswahl.</p>
      <div className="flex flex-wrap items-center gap-4">
        <FilterSheet
          title="Filter"
          closeLabel="Filter schliessen"
          handleLabel="Filter schliessen, ohne sie anzuwenden"
          resetLabel="Zurücksetzen"
          resetDisabled={countActive(draft) === 0}
          onReset={() => setDraft(emptyFilters)}
          applyLabel={count === 1 ? "1 Beispielprofil anzeigen" : `${count} Beispielprofile anzeigen`}
          onApply={() => setApplied(draft)}
          onOpenChange={(open) => (open ? setDraft(applied) : undefined)}
          trigger={<FilterBarButton count={countActive(applied)} accessibleLabel={`Filter anzeigen, ${countActive(applied)} aktiv`}>Filter</FilterBarButton>}
        >
          <FilterFields filters={draft} onChange={setDraft} prefix="sheet" />
        </FilterSheet>
        <p role="status" className="tabular text-small text-ink-muted">
          Angewendet: {countActive(applied)} Filter, {exampleCount(applied)} Beispielprofile
        </p>
      </div>
    </section>
  );
}
