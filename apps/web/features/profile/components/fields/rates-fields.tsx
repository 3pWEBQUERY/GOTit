"use client";

import { RATES_MAX } from "@app/core/provider-profile/schemas";
import { Button, Checkbox, Select, TextField } from "@app/ui";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DURATION_OPTIONS, formatDuration } from "../../../onboarding/format";
import type { RateFormRow } from "../../editor-values";
import type { FieldsProps } from "./types";

/**
 * Preise als Zeilen: Dauer, Preis in ganzen Franken, Hinweis, und ob der Preis
 * öffentlich erscheint (PRD v1 FR-PROFILE-003). Ohne sichtbare Preise steht im
 * Profil «Preise auf Anfrage».
 */
export function RatesFields({ value, onChange, errors, onBlurField, disabled }: FieldsProps<{ rates: RateFormRow[] }>) {
  const t = useTranslations("profile.fields");
  const tForm = useTranslations("profile.form");
  const locale = useLocale();
  const [counter, setCounter] = useState(0);
  const rows = value.rates;
  const update = (key: string, patch: Partial<RateFormRow>) => onChange({ rates: rows.map((row) => (row.key === key ? { ...row, ...patch } : row)) });

  function add() {
    onChange({ rates: [...rows, { key: `neu-${Date.now()}-${counter}`, durationMinutes: 60, price: "", note: "", hidden: false }] });
    setCounter(counter + 1);
    requestAnimationFrame(() => document.getElementById(`profil-preis-${rows.length}`)?.focus());
  }

  function remove(key: string) {
    onChange({ rates: rows.filter((row) => row.key !== key) });
    requestAnimationFrame(() => document.getElementById("profil-preis-hinzufuegen")?.focus());
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? <p className="text-body text-ink-muted">{t("ratesEmpty")}</p> : null}
      <ul className="flex flex-col gap-4">
        {rows.map((row, index) => {
          const options = [...new Set<number>([...DURATION_OPTIONS, row.durationMinutes])]
            .sort((a, b) => a - b)
            .map((minutes) => ({ value: String(minutes), label: formatDuration(locale, minutes) }));
          return (
            <li key={row.key} data-rate-row className="flex flex-col gap-3 border-b border-border pb-4">
              <h3 className="text-h3">{t("rateRow", { index: index + 1 })}</h3>
              <div className="grid gap-3 xs:grid-cols-2">
                <Select
                  id={`profil-dauer-${index}`}
                  label={t("duration")}
                  options={options}
                  disabled={disabled}
                  value={String(row.durationMinutes)}
                  onValueChange={(next) => update(row.key, { durationMinutes: Number(next) })}
                  error={errors.errorText(`rates.${index}.durationMinutes`)}
                />
                <TextField
                  id={`profil-preis-${index}`}
                  label={t("price")}
                  hint={t("priceHint")}
                  inputMode="numeric"
                  disabled={disabled}
                  value={row.price}
                  error={errors.errorText(`rates.${index}.priceChf`)}
                  onChange={(event) => update(row.key, { price: event.target.value })}
                  onBlur={() => onBlurField(`rates.${index}.priceChf`)}
                />
              </div>
              <TextField
                id={`profil-hinweis-${index}`}
                label={t("note")}
                hint={t("noteHint")}
                optionalLabel={tForm("optional")}
                maxLength={120}
                disabled={disabled}
                value={row.note}
                error={errors.errorText(`rates.${index}.note`)}
                onChange={(event) => update(row.key, { note: event.target.value })}
              />
              <Checkbox
                id={`profil-ausblenden-${index}`}
                label={t("hideRate")}
                description={t("hideRateHint")}
                disabled={disabled}
                checked={row.hidden}
                onCheckedChange={(checked) => update(row.key, { hidden: checked === true })}
              />
              <Button variant="quiet" icon={<Trash2 aria-hidden strokeWidth={1.5} />} className="self-start" disabled={disabled} onClick={() => remove(row.key)}>
                {t("removeRate", { index: index + 1 })}
              </Button>
            </li>
          );
        })}
      </ul>
      {rows.length < RATES_MAX ? (
        <Button id="profil-preis-hinzufuegen" variant="secondary" icon={<Plus aria-hidden strokeWidth={1.5} />} className="self-start" disabled={disabled} onClick={add}>
          {t("addRate")}
        </Button>
      ) : (
        <p className="text-small text-ink-muted">{t("ratesMax", { max: RATES_MAX })}</p>
      )}
    </div>
  );
}
