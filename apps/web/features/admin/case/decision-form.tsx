"use client";

import { Button, InlineAlert, RadioGroup, Select, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary, type SummaryEntry } from "../../settings/components/form-error-summary";
import { checkDecision, decideCase } from "../actions/decide";
import type { ReviewKind } from "@app/db";
import { CHANGE_DECISIONS, DECISIONS, FIELD_NOTE_AREAS, REVIEW_RULES, type Decision, type FieldNoteArea } from "../rules";
import { FieldNotes, fieldNoteId } from "./field-notes";
import { useAdminErrorText } from "./use-admin-error-text";

const IDS = { decision: "entscheid", reason: "entscheid-begruendung", rule: "entscheid-regel" } as const;
const EMPTY_NOTES = Object.fromEntries(FIELD_NOTE_AREAS.map((area) => [area, ""])) as Record<FieldNoteArea, string>;

function targetId(key: string): string {
  if (key === "fieldNotes") return fieldNoteId(FIELD_NOTE_AREAS[0]);
  if (key.startsWith("fieldNotes.")) return fieldNoteId(key.slice("fieldNotes.".length) as FieldNoteArea);
  return IDS[key as keyof typeof IDS] ?? IDS.decision;
}

function focusField(key: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(targetId(key));
    (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
  });
}

/**
 * Rechte Spalte: Entscheid mit Begründung und Regel (PRD 12.4). Bei «Zur
 * Korrektur» kommt je Bereich ein Grund dazu. Nach dem Speichern geht es zum
 * nächsten offenen Fall oder zurück zur Warteschlange.
 */
export function DecisionForm({ reviewId, kind, queueHref }: { reviewId: string; kind: ReviewKind; queueHref: string }) {
  const t = useTranslations("admin.decision");
  const tRules = useTranslations("admin.rules");
  const errorText = useAdminErrorText();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const hintKey = kind === "CHANGE" ? "changeOptionHint" : "optionHint";
  const [decision, setDecision] = useState<Decision | "">("");
  const [reason, setReason] = useState("");
  const [rule, setRule] = useState("");
  const [notes, setNotes] = useState(EMPTY_NOTES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function payload() {
    const fieldNotes = decision === "CHANGES_REQUESTED" ? Object.fromEntries(Object.entries(notes).filter(([, text]) => text.trim() !== "")) : {};
    return { reviewId, decision: decision || undefined, reason, rule, fieldNotes };
  }

  async function blur(key: string) {
    try {
      const found = await checkDecision(payload());
      setErrors((current) => {
        const groupSolved = key.startsWith("fieldNotes") && !found.fieldNotes;
        const rest = Object.fromEntries(Object.entries(current).filter(([name]) => name !== key && !(groupSolved && name === "fieldNotes")));
        return found[key] ? { ...rest, [key]: found[key] } : rest;
      });
    } catch {
      // Die Prüfung beim Verlassen ist eine Hilfe; beim Speichern wird ohnehin geprüft.
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await decideCase(payload());
      if (result.ok) {
        toast({ title: t("saved"), tone: "success" });
        const nextId = result.data?.nextId;
        router.push(nextId ? `${queueHref}/${nextId}` : queueHref);
        return;
      }
      if (result.formError === "alreadyDecided") {
        router.replace(`${pathname}?hinweis=entschieden`);
        router.refresh();
        return;
      }
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(result.formError ?? (Object.keys(fieldErrors).length > 0 ? null : "generic"));
      const first = Object.keys(fieldErrors)[0];
      if (first) focusField(first);
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const summary: SummaryEntry[] = Object.entries(errors).map(([key, message]) => ({ fieldId: targetId(key), message: errorText(message) }));
  const errorFor = (key: string) => (errors[key] ? errorText(errors[key]) : undefined);

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6" data-decision-form>
      {formError === "identityInvalid" ? (
        <InlineAlert tone="error" title={errorText("identityInvalid")}>
          {t("identityInvalidHelp")}
        </InlineAlert>
      ) : (
        <FormErrorSummary title={t("summaryTitle")} entries={summary} formError={formError ? errorText(formError) : null} />
      )}
      <div id={IDS.decision}>
        <RadioGroup
          label={t("decision")}
          name="entscheid"
          value={decision}
          onValueChange={(value) => {
            setDecision(value as Decision);
            setErrors(({ decision: _removed, ...rest }) => rest);
          }}
          options={(kind === "CHANGE" ? CHANGE_DECISIONS : DECISIONS).map((value) => ({ value, label: t(`option.${value}`), description: t(`${hintKey}.${value}`) }))}
          error={errorFor("decision")}
        />
      </div>
      <TextArea
        id={IDS.reason}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={4}
        maxLength={2000}
        value={reason}
        error={errorFor("reason")}
        onChange={(event) => setReason(event.target.value)}
        onBlur={() => void blur("reason")}
      />
      <Select
        id={IDS.rule}
        label={t("rule")}
        placeholder={t("rulePlaceholder")}
        value={rule || undefined}
        onValueChange={(value) => {
          setRule(value);
          setErrors(({ rule: _removed, ...rest }) => rest);
        }}
        options={REVIEW_RULES.map((entry) => ({ value: entry.id, label: `${entry.id} ${tRules(entry.key)}` }))}
        error={errorFor("rule")}
      />
      {decision === "CHANGES_REQUESTED" ? (
        <FieldNotes
          values={notes}
          onChange={(area, value) => setNotes((current) => ({ ...current, [area]: value }))}
          onBlur={(area) => void blur(`fieldNotes.${area}`)}
          groupError={errorFor("fieldNotes")}
          errorFor={(area) => errorFor(`fieldNotes.${area}`)}
        />
      ) : null}
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
