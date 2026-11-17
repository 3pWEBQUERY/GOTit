"use client";

import { Button, Select, TextField } from "@app/ui";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DURATION_OPTIONS, formatDuration } from "../format";

export interface RateRow {
  key: string;
  duration: number;
  price: string;
  note: string;
}

export interface RateRowFieldsProps {
  row: RateRow;
  index: number;
  errorText: (path: string) => string | undefined;
  onChange: (patch: Partial<RateRow>) => void;
  onPriceBlur: () => void;
  onRemove: () => void;
}

/** Eine Preiszeile: Dauer aus einer Auswahl, Preis in ganzen Franken, Hinweis optional. */
export function RateRowFields({ row, index, errorText, onChange, onPriceBlur, onRemove }: RateRowFieldsProps) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const options = [...new Set<number>([...DURATION_OPTIONS, row.duration])]
    .sort((a, b) => a - b)
    .map((minutes) => ({ value: String(minutes), label: formatDuration(locale, minutes) }));

  return (
    <li data-rate-row className="flex flex-col gap-3 border-b border-border pb-4">
      <h3 className="text-h3">{t("offer.row", { index: index + 1 })}</h3>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Select
          id={`angebot-dauer-${index}`}
          label={t("offer.duration")}
          options={options}
          value={String(row.duration)}
          onValueChange={(value) => onChange({ duration: Number(value) })}
          error={errorText(`rates.${index}.durationMinutes`)}
        />
        <TextField
          id={`angebot-preis-${index}`}
          label={t("offer.price")}
          hint={t("offer.priceHint")}
          inputMode="numeric"
          value={row.price}
          error={errorText(`rates.${index}.priceChf`)}
          onChange={(event) => onChange({ price: event.target.value })}
          onBlur={onPriceBlur}
        />
      </div>
      <TextField
        id={`angebot-hinweis-${index}`}
        label={t("offer.note")}
        hint={t("offer.noteHint")}
        optionalLabel={t("form.optional")}
        maxLength={120}
        value={row.note}
        error={errorText(`rates.${index}.note`)}
        onChange={(event) => onChange({ note: event.target.value })}
      />
      <Button variant="quiet" icon={<Trash2 strokeWidth={1.5} />} className="self-start" onClick={onRemove}>
        {t("offer.remove", { index: index + 1 })}
      </Button>
    </li>
  );
}
