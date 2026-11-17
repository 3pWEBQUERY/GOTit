"use client";

import { offerSchema } from "@app/core/onboarding/schemas";
import { Button } from "@app/ui";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary } from "../../settings/components/form-error-summary";
import { saveOfferAction } from "../actions/save-step";
import { RateRowFields, type RateRow } from "./rate-row-fields";
import { StepActions, type StepBack } from "./step-actions";
import { issuesToErrors, normalizeErrors, useStepErrors } from "./use-step-errors";

const MAX_RATES = 12;
const ADD_ID = "angebot-preis-hinzufuegen";

export interface OfferFormProps {
  initial: readonly {
    durationMinutes: number;
    priceChf: number;
    note: string | null;
  }[];
  nextHref: string;
  back: StepBack | null;
}

const FIELD_IDS: Record<string, string> = {
  durationMinutes: "dauer",
  priceChf: "preis",
  note: "hinweis",
};

function fieldId(path: string): string {
  const [, index, field] = path.split(".");
  return field && index ? `angebot-${FIELD_IDS[field] ?? "preis"}-${index}` : ADD_ID;
}

const fallback = (path: string) => (path.endsWith("priceChf") ? "priceInvalid" : "generic");

function toInput(rows: readonly RateRow[]) {
  return {
    rates: rows.map((row) => ({
      durationMinutes: row.duration,
      priceChf: /^\d+$/.test(row.price.trim()) ? Number(row.price.trim()) : Number.NaN,
      note: row.note.trim() || undefined,
    })),
  };
}

/** Preise als Zeilen: Dauer, Preis in CHF, Hinweis. Ohne Zeilen steht im Profil «Preise auf Anfrage». */
export function OfferForm({ initial, nextHref, back }: OfferFormProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [rows, setRows] = useState<RateRow[]>(() =>
    initial.map((rate, index) => ({
      key: `r${index}`,
      duration: rate.durationMinutes,
      price: String(rate.priceChf),
      note: rate.note ?? "",
    })),
  );
  const [counter, setCounter] = useState(initial.length);
  const [pending, setPending] = useState(false);
  const form = useStepErrors(fieldId);

  const update = (key: string, patch: Partial<RateRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function add() {
    setRows((current) => [...current, { key: `n${counter}`, duration: 60, price: "", note: "" }]);
    setCounter(counter + 1);
    requestAnimationFrame(() => document.getElementById(`angebot-preis-${rows.length}`)?.focus());
  }

  function remove(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
    form.applyAll({});
    requestAnimationFrame(() => document.getElementById(ADD_ID)?.focus());
  }

  function validate(next: readonly RateRow[]) {
    const parsed = offerSchema.safeParse(toInput(next));
    return parsed.success ? {} : issuesToErrors(parsed.error.issues, fallback);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.applyAll(validate(rows))) return;
    setPending(true);
    try {
      const result = await saveOfferAction(toInput(rows));
      if (result.ok) {
        router.push(nextHref);
        return;
      }
      form.applyAll(normalizeErrors(result.fieldErrors ?? {}, fallback), result.formError ?? null);
    } catch {
      form.applyAll({}, "generic");
    }
    setPending(false);
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FormErrorSummary title={t("form.summaryTitle")} entries={form.summary} formError={form.formError} />
      <section aria-labelledby="angebot-preise" className="flex flex-col gap-4">
        <h2 id="angebot-preise" className="text-h2">
          {t("offer.ratesTitle")}
        </h2>
        {rows.length === 0 ? <p className="text-body text-ink-muted">{t("offer.empty")}</p> : null}
        <ol className="flex flex-col gap-4">
          {rows.map((row, index) => (
            <RateRowFields
              key={row.key}
              row={row}
              index={index}
              errorText={form.errorText}
              onChange={(patch) => update(row.key, patch)}
              onPriceBlur={() => form.applyField(`rates.${index}.priceChf`, validate(rows))}
              onRemove={() => remove(row.key)}
            />
          ))}
        </ol>
        {rows.length < MAX_RATES ? (
          <Button id={ADD_ID} icon={<Plus strokeWidth={1.5} />} className="self-start" onClick={add}>
            {t("offer.add")}
          </Button>
        ) : (
          <p id={ADD_ID} tabIndex={-1} className="text-small text-ink-muted">
            {t("offer.max")}
          </p>
        )}
      </section>
      <section aria-labelledby="angebot-leistungen" className="flex flex-col gap-2">
        <h2 id="angebot-leistungen" className="text-h2">
          {t("offer.servicesTitle")}
        </h2>
        <p className="text-body text-ink-muted">{t("offer.servicesText")}</p>
      </section>
      <StepActions back={back}>
        <Button type="submit" variant="primary" loading={pending}>
          {t("nav.saveAndContinue")}
        </Button>
      </StepActions>
    </form>
  );
}
