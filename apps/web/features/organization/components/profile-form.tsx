"use client";

import { organizationProfileSchema } from "@app/core/organization/schemas";
import { Button, InlineAlert, TextArea, TextField, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { saveProfileAction } from "../actions/profile";
import { focusFirstError, useSchemaForm } from "../lib/use-schema-form";
import { ErrorSummary } from "./error-summary";

export interface ProfileValues {
  name: string;
  description: string;
  website: string;
  phone: string;
  publicEmail: string;
}

const FIELDS = [
  ["name", "org-name"],
  ["description", "org-beschreibung"],
  ["website", "org-website"],
  ["phone", "org-telefon"],
  ["publicEmail", "org-email"],
] as const;

/** Unternehmensprofil (v1 FR-BUSINESS-001) mit Speichern-Button und Fehlern am Feld (PRD 13). */
export function ProfileForm({
  slug,
  initial,
  canEdit,
}: {
  slug: string;
  initial: ProfileValues;
  canEdit: boolean;
}) {
  const t = useTranslations("organization.profile");
  const tForm = useTranslations("organization.form");
  const router = useRouter();
  const { toast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const { values, set, errors, setErrors, blur, validate } = useSchemaForm(
    organizationProfileSchema,
    initial,
  );
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const message = (field: string) => {
    const code = errors[field];
    if (!code) return undefined;
    return tForm.has(`errors.${code}`)
      ? tForm(`errors.${code}`)
      : tForm("errors.invalid");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setFailed(null);
    if (Object.keys(validate()).length > 0)
      return focusFirstError(form.current);
    setPending(true);
    const result = await saveProfileAction(slug, values).catch(() => ({
      ok: false as const,
      formError: "generic",
      fieldErrors: undefined,
    }));
    setPending(false);
    if (result.ok) {
      toast({ title: t("saved"), tone: "success" });
      router.refresh();
      return;
    }
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      return focusFirstError(form.current);
    }
    setFailed(result.formError ?? "generic");
  }

  const summary = attempted
    ? FIELDS.flatMap(([field, id]) =>
        message(field)
          ? [{ fieldId: id, message: `${t(field)}: ${message(field)}` }]
          : [],
      )
    : [];
  const common = (field: (typeof FIELDS)[number][0]) => ({
    id: FIELDS.find(([name]) => name === field)?.[1],
    label: t(field),
    value: values[field],
    disabled: !canEdit || pending,
    error: message(field),
    onBlur: () => blur(field),
  });

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex max-w-reading flex-col gap-5"
      data-organization-profile-form
    >
      <ErrorSummary items={summary} />
      {failed ? (
        <InlineAlert tone="error" title={tForm(`errors.${failed}`)}>
          {tForm("nothingLost")}
        </InlineAlert>
      ) : null}
      <TextField
        {...common("name")}
        hint={t("nameHint")}
        maxLength={80}
        autoComplete="organization"
        onChange={(event) => set("name", event.target.value)}
      />
      <TextArea
        {...common("description")}
        hint={t("descriptionHint")}
        optionalLabel={tForm("optional")}
        rows={8}
        maxLength={3000}
        countLabel={(used, max) => tForm("count", { used, max })}
        onChange={(event) => set("description", event.target.value)}
      />
      <TextField
        {...common("website")}
        hint={t("websiteHint")}
        optionalLabel={tForm("optional")}
        type="url"
        inputMode="url"
        autoComplete="url"
        onChange={(event) => set("website", event.target.value)}
      />
      <TextField
        {...common("phone")}
        hint={t("phoneHint")}
        optionalLabel={tForm("optional")}
        type="tel"
        autoComplete="tel"
        onChange={(event) => set("phone", event.target.value)}
      />
      <TextField
        {...common("publicEmail")}
        hint={t("publicEmailHint")}
        optionalLabel={tForm("optional")}
        type="email"
        autoComplete="email"
        onChange={(event) => set("publicEmail", event.target.value)}
      />
      {canEdit ? (
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          className="self-start"
        >
          {t("save")}
        </Button>
      ) : null}
    </form>
  );
}
