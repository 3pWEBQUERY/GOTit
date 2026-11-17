"use client";

import { verificationSchema } from "@app/core/organization/schemas";
import {
  Button,
  Checkbox,
  InlineAlert,
  TextArea,
  TextField,
  useToast,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { submitVerificationAction } from "../actions/profile";
import { focusFirstError, useSchemaForm } from "../lib/use-schema-form";
import { ErrorSummary } from "./error-summary";

export interface VerificationValues {
  legalName: string;
  uid: string;
  authorityConfirmed: boolean;
  permitNote: string;
}

const IDS = {
  legalName: "nachweis-firma",
  uid: "nachweis-uid",
  authorityConfirmed: "nachweis-berechtigung",
  permitNote: "nachweis-bewilligung",
} as const;

/** Nachweise einreichen (v1 FR-VERIFY-003): Firma, UID, Berechtigung, Bewilligungen in Worten. */
export function VerificationForm({
  slug,
  initial,
  submitLabel,
}: {
  slug: string;
  initial: VerificationValues;
  submitLabel: string;
}) {
  const t = useTranslations("organization.credentials");
  const tForm = useTranslations("organization.form");
  const router = useRouter();
  const { toast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const { values, set, errors, setErrors, blur, validate } = useSchemaForm(
    verificationSchema,
    initial,
  );
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const message = (field: keyof VerificationValues) => {
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
    const result = await submitVerificationAction(slug, values).catch(() => ({
      ok: false as const,
      formError: "generic",
      fieldErrors: undefined,
    }));
    setPending(false);
    if (result.ok) {
      toast({ title: t("submitted"), tone: "success" });
      router.refresh();
      return;
    }
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      return focusFirstError(form.current);
    }
    setFailed(result.formError ?? "generic");
  }

  const fields = [
    "legalName",
    "uid",
    "authorityConfirmed",
    "permitNote",
  ] as const;
  const summary = attempted
    ? fields.flatMap((field) =>
        message(field)
          ? [{ fieldId: IDS[field], message: `${t(field)}: ${message(field)}` }]
          : [],
      )
    : [];

  return (
    <form
      ref={form}
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex max-w-reading flex-col gap-5"
      data-verification-form
    >
      <ErrorSummary items={summary} />
      {failed ? (
        <InlineAlert tone="error" title={tForm(`errors.${failed}`)}>
          {tForm("nothingLost")}
        </InlineAlert>
      ) : null}
      <TextField
        id={IDS.legalName}
        label={t("legalName")}
        hint={t("legalNameHint")}
        maxLength={120}
        autoComplete="organization"
        value={values.legalName}
        disabled={pending}
        error={message("legalName")}
        onChange={(event) => set("legalName", event.target.value)}
        onBlur={() => blur("legalName")}
      />
      <TextField
        id={IDS.uid}
        label={t("uid")}
        hint={t("uidHint")}
        placeholder="CHE-123.456.789"
        maxLength={15}
        autoCapitalize="characters"
        spellCheck={false}
        value={values.uid}
        disabled={pending}
        error={message("uid")}
        onChange={(event) => set("uid", event.target.value)}
        onBlur={() => blur("uid")}
      />
      <Checkbox
        id={IDS.authorityConfirmed}
        label={t("authorityConfirmed")}
        description={t("authorityConfirmedHint")}
        checked={values.authorityConfirmed}
        disabled={pending}
        error={message("authorityConfirmed")}
        onCheckedChange={(checked) => {
          set("authorityConfirmed", checked === true);
          if (checked === true)
            setErrors((current) =>
              Object.fromEntries(
                Object.entries(current).filter(
                  ([field]) => field !== "authorityConfirmed",
                ),
              ),
            );
        }}
      />
      <TextArea
        id={IDS.permitNote}
        label={t("permitNote")}
        hint={t("permitNoteHint")}
        optionalLabel={tForm("optional")}
        rows={3}
        maxLength={1000}
        countLabel={(used, max) => tForm("count", { used, max })}
        value={values.permitNote}
        disabled={pending}
        error={message("permitNote")}
        onChange={(event) => set("permitNote", event.target.value)}
        onBlur={() => blur("permitNote")}
      />
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {submitLabel}
      </Button>
    </form>
  );
}
