"use client";

import { Button, InlineAlert, RadioGroup, TextArea, TextField, UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { useReportDialog } from "../messages/components/thread/report-labels";
import { FormErrorSummary } from "./form-error-summary";
import { Honeypot } from "./honeypot";
import { submitPublicReportAction } from "./report-actions";

const FIELDS = ["url", "reason", "details", "contactEmail"] as const;
type Field = (typeof FIELDS)[number];

/**
 * Meldung ohne Konto `/melden` (v2 7.8): Adresse des Inhalts, Grund wie im
 * Meldedialog der App, Beschreibung und freiwillige Kontaktadresse.
 */
export function PublicReportForm({ initialUrl, homeHref }: { initialUrl: string; homeHref: string }) {
  const t = useTranslations("info.report");
  const { reasons, labels } = useReportDialog("message");
  const [values, setValues] = useState<Record<Field, string>>({ url: initialUrl, reason: "", details: "", contactEmail: "" });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<{ key: string; minutes?: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ urgent: boolean } | null>(null);
  const id = (field: Field) => `melden-${field}`;
  const urgent = reasons.find((reason) => reason.value === values.reason)?.urgent ?? false;

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  function focus(keys: string[]) {
    const first = FIELDS.find((field) => keys.includes(field));
    if (!first) return;
    requestAnimationFrame(() => {
      const element = document.getElementById(id(first));
      (element?.matches("input,textarea") ? element : element?.querySelector<HTMLElement>("[role=radio]"))?.focus();
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    const result = await submitPublicReportAction({ ...values, website }).catch(() => ({ ok: false as const, formError: "generic", fieldErrors: undefined, retryAfterSeconds: undefined }));
    setPending(false);
    if (result.ok) {
      setSent(result.data ?? { urgent });
      return;
    }
    setErrors(result.fieldErrors ?? {});
    if (result.formError) setFormError({ key: result.formError, minutes: result.retryAfterSeconds ? Math.ceil(result.retryAfterSeconds / 60) : undefined });
    focus(Object.keys(result.fieldErrors ?? {}));
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-4" data-report-sent>
        <InlineAlert tone="success" title={t("sentTitle")}>
          {sent.urgent ? t("sentUrgent") : t("sentText")}
        </InlineAlert>
        <p className="max-w-prose text-body">{t("sentNext")}</p>
        <Button asChild variant="secondary" className="self-start">
          <UiLink href={homeHref}>{t("toHome")}</UiLink>
        </Button>
      </div>
    );
  }

  const errorText = (field: Field) => (errors[field] ? t(`errors.${errors[field]}`) : undefined);
  const summary = FIELDS.filter((field) => errors[field]).map((field) => ({ id: id(field), message: errorText(field) ?? "" }));
  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex max-w-2xl flex-col gap-5" data-report-form>
      <FormErrorSummary title={t("errors.summary", { count: summary.length })} items={summary} />
      {formError ? <InlineAlert tone="error" title={t(`errors.${formError.key}`, { minutes: formError.minutes ?? 60 })}>{t("errors.kept")}</InlineAlert> : null}
      <TextField id={id("url")} type="url" inputMode="url" label={t("url")} hint={t("urlHint")} maxLength={500} value={values.url} onChange={(event) => set("url", event.target.value)} error={errorText("url")} />
      <div id={id("reason")}>
        <RadioGroup label={labels.reasonLegend} name="melden-grund" value={values.reason} onValueChange={(value) => set("reason", value)} options={reasons.map((reason) => ({ value: reason.value, label: reason.label }))} error={errorText("reason")} />
      </div>
      {urgent ? (
        <InlineAlert tone="warning" title={labels.urgentTitle}>
          {t("urgentText")}
        </InlineAlert>
      ) : null}
      <TextArea
        id={id("details")}
        label={t("details")}
        optionalLabel={t("optional")}
        hint={t("detailsHint")}
        rows={5}
        maxLength={2000}
        countLabel={(used, max) => t("count", { used, max })}
        value={values.details}
        onChange={(event) => set("details", event.target.value)}
        error={errorText("details")}
      />
      <TextField
        id={id("contactEmail")}
        type="email"
        autoComplete="email"
        label={t("contactEmail")}
        optionalLabel={t("optional")}
        hint={t("contactEmailHint")}
        maxLength={254}
        value={values.contactEmail}
        onChange={(event) => set("contactEmail", event.target.value)}
        onBlur={() => setErrors((current) => ({ ...current, contactEmail: values.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim()) ? "emailInvalid" : undefined }))}
        error={errorText("contactEmail")}
      />
      <Honeypot label={t("honeypot")} value={website} onChange={setWebsite} />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
