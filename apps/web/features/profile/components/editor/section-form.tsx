"use client";

import type { OwnProfileEditor } from "@app/core/provider-profile";
import { SECTION_CRITICAL_FIELDS, SECTION_SCHEMAS, splitCritical, type ProfileSection } from "@app/core/provider-profile/schemas";
import { Button, InlineAlert, useToast } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { issuesToErrors, normalizeErrors } from "../../../onboarding/components/use-step-errors";
import { FormErrorSummary } from "../../../settings/components/form-error-summary";
import { saveProfileSectionAction } from "../../actions/save-section";
import { requestedCritical, sameValues, toSectionInput, type FormValues } from "../../editor-values";
import { SectionFields, type EditorChoices } from "./section-fields";
import { useSectionErrors } from "./use-section-errors";

export type EditorSnapshot = Pick<OwnProfileEditor, "mode" | "status" | "published" | "pending" | "pendingSince">;

export interface SectionFormProps {
  section: ProfileSection;
  editor: EditorSnapshot;
  form: FormValues;
  /** Gespeicherter Stand, zum Erkennen ungespeicherter Änderungen. */
  saved: FormValues;
  onChange: (form: FormValues) => void;
  onSaved: () => void;
  choices: EditorChoices;
  formId: string;
  /** Platz der Buttons; im Seitenpanel stehen sie im haftenden Fuss. */
  renderActions?: (save: ReactNode) => ReactNode;
}

const fallback = (path: string) => (path.endsWith("priceChf") ? "priceInvalid" : "generic");

/**
 * Formular eines Abschnitts (PRD v2 11.2, 13): prüft beim Verlassen eines Felds
 * und beim Speichern, zeigt Fehler am Feld und oben. Prüfpflichtige Änderungen
 * kündigt es vor dem Speichern an; danach steht «Änderung in Prüfung» da.
 */
export function SectionForm({ section, editor, form, saved, onChange, onSaved, choices, formId, renderActions }: SectionFormProps) {
  const t = useTranslations("profile.editor");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  const errors = useSectionErrors(section);
  const [submitting, setSubmitting] = useState(false);
  const locked = editor.mode === "locked";
  const dirty = !sameValues(form[section], saved[section]);
  const reviewed = editor.mode === "reviewed" && Object.keys(splitCritical(editor.published, requestedCritical(section, form), editor.mode).pending).length > 0;
  const pendingHere = SECTION_CRITICAL_FIELDS[section].some((field) => editor.pending?.[field] !== undefined);

  const check = (next: FormValues) => {
    const parsed = SECTION_SCHEMAS[section].safeParse(toSectionInput(section, next));
    return parsed.success ? {} : issuesToErrors(parsed.error.issues, fallback);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked || errors.applyAll(check(form))) return;
    setSubmitting(true);
    try {
      const result = await saveProfileSectionAction(section, toSectionInput(section, form));
      if (result.ok) {
        const pending = (result.data?.pending.length ?? 0) > 0;
        toast({ title: pending ? t("savedPending") : t("saved"), tone: "success" });
        onSaved();
        router.refresh();
      } else {
        errors.applyAll(normalizeErrors(result.fieldErrors ?? {}, fallback), result.formError ?? null);
      }
    } catch {
      errors.applyAll({}, "generic");
    }
    setSubmitting(false);
  }

  const save = locked ? null : (
    <Button type="submit" form={formId} variant="primary" loading={submitting}>
      {t("save")}
    </Button>
  );

  return (
    // autoComplete="off": Der Browser stellt beim Neuladen keine Feldwerte wieder her; das übernimmt der Zwischenspeicher des Abschnitts.
    <form id={formId} noValidate autoComplete="off" onSubmit={(event) => void submit(event)} className="flex flex-col gap-6" data-section-form={section}>
      {locked ? <InlineAlert tone="warning" title={t(`locked.${editor.status === "SUBMITTED" ? "inReview" : "blocked"}`)} /> : null}
      {pendingHere && !dirty ? (
        <InlineAlert tone="info" title={t("pendingTitle")}>
          {editor.pendingSince ? t("pendingSince", { date: format.dateTime(editor.pendingSince, { day: "2-digit", month: "2-digit", year: "numeric" }) }) : t("pendingText")}
        </InlineAlert>
      ) : null}
      <FormErrorSummary title={t("summaryTitle")} entries={errors.summary} formError={errors.formError} />
      <SectionFields
        section={section}
        form={form}
        onChange={onChange}
        errors={errors}
        onBlurField={(path) => errors.applyField(path, check(form))}
        choices={choices}
        disabled={locked}
      />
      {reviewed && dirty ? (
        <InlineAlert tone="info" title={t("reviewNotice")} />
      ) : null}
      {renderActions ? renderActions(save) : save ? <div className="flex flex-wrap gap-2">{save}</div> : null}
    </form>
  );
}
