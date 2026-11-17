"use client";

import { Button, InlineAlert, Select, TextArea, TextField, UiLink } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { submitContactAction } from "./contact-actions";
import { FormErrorSummary } from "./form-error-summary";
import { Honeypot } from "./honeypot";

const FIELDS = ["category", "email", "subject", "message"] as const;
type Field = (typeof FIELDS)[number];

/**
 * Kontaktformular `/kontakt` (v2 7.8): Kategorie, E-Mail (mit Konto fest),
 * Betreff, Nachricht. Prüfung beim Verlassen, Fehler am Feld und oben, nach
 * dem Senden die Nummer der Anfrage.
 */
export function ContactForm({ categories, accountEmail, initialCategory, helpHref }: { categories: readonly string[]; accountEmail: string | null; initialCategory?: string; helpHref: string }) {
  const t = useTranslations("info.contact");
  const locale = useLocale();
  const [values, setValues] = useState<Record<Field, string>>({ category: initialCategory ?? "", email: accountEmail ?? "", subject: "", message: "" });
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<{ key: string; minutes?: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ reference: string | null; email: string } | null>(null);
  const id = (field: Field) => `kontakt-${field}`;

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  function check(field: Field): string | undefined {
    const value = values[field].trim();
    if (!value) return undefined;
    if (field === "email" && !accountEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "emailInvalid";
    if (field === "subject" && value.length < 3) return "subjectShort";
    if (field === "message" && value.length < 20) return "messageShort";
    return undefined;
  }

  function focus(keys: string[]) {
    const first = FIELDS.find((field) => keys.includes(field));
    if (first) requestAnimationFrame(() => document.getElementById(id(first))?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    const result = await submitContactAction({ ...values, locale, website }).catch(() => ({ ok: false as const, formError: "generic", fieldErrors: undefined, retryAfterSeconds: undefined }));
    setPending(false);
    if (result.ok) {
      setSent(result.data ?? { reference: null, email: values.email });
      return;
    }
    setErrors(result.fieldErrors ?? {});
    if (result.formError) setFormError({ key: result.formError, minutes: result.retryAfterSeconds ? Math.ceil(result.retryAfterSeconds / 60) : undefined });
    focus(Object.keys(result.fieldErrors ?? {}));
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-4" data-contact-sent>
        <InlineAlert tone="success" title={sent.reference ? t("sentTitle", { reference: sent.reference }) : t("sentTitleNoReference")}>
          {t("sentText", { email: sent.email })}
        </InlineAlert>
        <Button asChild variant="secondary" className="self-start">
          <UiLink href={helpHref}>{t("toHelp")}</UiLink>
        </Button>
      </div>
    );
  }

  const errorText = (field: Field) => (errors[field] ? t(`errors.${errors[field]}`) : undefined);
  const summary = FIELDS.filter((field) => errors[field]).map((field) => ({ id: id(field), message: errorText(field) ?? "" }));
  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex max-w-2xl flex-col gap-5" data-contact-form>
      <FormErrorSummary title={t("errors.summary", { count: summary.length })} items={summary} />
      {formError ? <InlineAlert tone="error" title={t(`errors.${formError.key}`, { minutes: formError.minutes ?? 60 })}>{t("errors.kept")}</InlineAlert> : null}
      <Select
        id={id("category")}
        label={t("category")}
        placeholder={t("categoryPlaceholder")}
        value={values.category || undefined}
        onValueChange={(value) => set("category", value)}
        options={categories.map((value) => ({ value, label: t(`categories.${value}`) }))}
        error={errorText("category")}
      />
      {values.category === "appeal" ? <InlineAlert tone="info" title={t("appealTitle")}>{t("appealText")}</InlineAlert> : null}
      <TextField
        id={id("email")}
        type="email"
        autoComplete="email"
        label={t("email")}
        hint={accountEmail ? t("emailLocked") : t("emailHint")}
        readOnly={Boolean(accountEmail)}
        value={values.email}
        maxLength={254}
        onChange={(event) => set("email", event.target.value)}
        onBlur={() => setErrors((current) => ({ ...current, email: check("email") }))}
        error={errorText("email")}
      />
      <TextField id={id("subject")} label={t("subject")} maxLength={150} value={values.subject} onChange={(event) => set("subject", event.target.value)} onBlur={() => setErrors((current) => ({ ...current, subject: check("subject") }))} error={errorText("subject")} />
      <TextArea
        id={id("message")}
        label={t("message")}
        hint={t("messageHint")}
        rows={7}
        maxLength={5000}
        countLabel={(used, max) => t("count", { used, max })}
        value={values.message}
        onChange={(event) => set("message", event.target.value)}
        onBlur={() => setErrors((current) => ({ ...current, message: check("message") }))}
        error={errorText("message")}
      />
      <Honeypot label={t("honeypot")} value={website} onChange={setWebsite} />
      <p className="max-w-prose text-small text-ink-muted">{t("privacy")}</p>
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("submit")}
      </Button>
    </form>
  );
}
