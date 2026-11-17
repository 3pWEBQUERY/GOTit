"use client";

import { Button, DateField, RadioGroup, Select, TextArea, useToast } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary } from "../../settings/components/form-error-summary";
import { decideCaseAction } from "../actions/moderation";
import { REASON_MAX, REASON_MIN, decisionRules } from "./decision-rules";

const IDS = {
  decision: "fall-entscheid",
  rule: "fall-regel",
  restrictionKind: "fall-einschraenkung",
  until: "fall-ende",
  reason: "fall-begruendung",
} as const;
type Field = keyof typeof IDS;
type Kind = "MESSAGING" | "BOOKING";

export interface DecisionChoice {
  value: string;
  label: string;
  hint: string;
}

/** Fehler im Browser, wie sie der Server auch meldet; der Senden-Button bleibt aktiv und erklärt, was fehlt. */
function localErrors(input: { decision: string; rule: string; reason: string; kind: string; until: string | null; untilText: boolean }): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {};
  if (!input.decision) errors.decision = "decisionRequired";
  if (!input.rule) errors.rule = "ruleRequired";
  else if (input.decision === "NO_ACTION" && input.rule !== "R-MOD-0") errors.rule = "ruleNoViolation";
  else if (input.decision && input.decision !== "NO_ACTION" && input.rule === "R-MOD-0") errors.rule = "ruleViolation";
  if (input.decision === "ACCOUNT_RESTRICTED" && !input.kind) errors.restrictionKind = "kindRequired";
  if (input.untilText && !input.until) errors.until = "untilInvalid";
  const reason = input.reason.trim().length;
  if (reason < REASON_MIN) errors.reason = "reasonTooShort";
  else if (reason > REASON_MAX) errors.reason = "reasonTooLong";
  return errors;
}

function focusFirst(errors: Partial<Record<Field, string>>) {
  const first = (Object.keys(IDS) as Field[]).find((field) => errors[field]);
  if (!first) return;
  requestAnimationFrame(() => {
    const element = document.getElementById(IDS[first]);
    (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
  });
}

/**
 * Entscheid über einen Fall (v2 12.4): Ergebnis, Regel, bei Einschränkung
 * die Art, bei Massnahmen am Konto ein optionales Ende und die Begründung.
 * «Kein Verstoss» geht nur mit R-MOD-0, jede Massnahme nur mit einer
 * anderen Regel. Danach öffnet sich der nächste Fall.
 */
export function CaseDecisionForm({
  reportId,
  decisions,
  ruleKeys,
  ruleLabels,
  queueHref,
  caseHrefBase,
  today,
}: {
  reportId: string;
  decisions: readonly DecisionChoice[];
  ruleKeys: readonly string[];
  ruleLabels: Record<string, string>;
  queueHref: string;
  /** Pfad eines Falls ohne ID, zum Beispiel `/de/admin/moderation/`. */
  caseHrefBase: string;
  /** Heute in Zürcher Zeit (YYYY-MM-DD), frühestes Ende. */
  today: string;
}) {
  const t = useTranslations("moderation.decision");
  const tErrors = useTranslations("moderation.errors");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [decision, setDecision] = useState("");
  const [rule, setRule] = useState("");
  const [kind, setKind] = useState<Kind | "">("");
  const [until, setUntil] = useState<string | null>(null);
  const [untilText, setUntilText] = useState(false);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorText = (key: string) => (tErrors.has(key) ? tErrors(key) : tErrors("generic"));
  const measure = decision === "ACCOUNT_RESTRICTED" || decision === "ACCOUNT_SUSPENDED";
  const rules = decisionRules(decision || null, ruleKeys);

  function clear(field: Field) {
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = localErrors({ decision, rule, reason, kind, until, untilText: measure && untilText });
    setFormError(null);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirst(found);
      return;
    }
    setPending(true);
    try {
      const result = await decideCaseAction({
        reportId,
        decision,
        rule,
        reason,
        restrictionKind: decision === "ACCOUNT_RESTRICTED" ? kind : undefined,
        untilDay: measure ? until : null,
      });
      if (result.ok) {
        toast({ title: t("saved"), tone: "success" });
        const nextId = result.data?.nextId;
        router.push(nextId ? `${caseHrefBase}${nextId}` : queueHref);
        return;
      }
      if (result.formError === "alreadyDecided") {
        router.replace(`${pathname}?hinweis=entschieden`);
        router.refresh();
        return;
      }
      const fieldErrors = (result.fieldErrors ?? {}) as Partial<Record<Field, string>>;
      setErrors(fieldErrors);
      setFormError(result.formError ?? null);
      focusFirst(fieldErrors);
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const summary = (Object.keys(IDS) as Field[]).filter((field) => errors[field]).map((field) => ({ fieldId: IDS[field], message: errorText(errors[field] ?? "") }));
  const errorFor = (field: Field) => (errors[field] ? errorText(errors[field] ?? "") : undefined);

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6" data-case-decision-form>
      <FormErrorSummary title={t("summaryTitle")} entries={summary} formError={formError ? errorText(formError) : null} />
      <div id={IDS.decision}>
        <RadioGroup
          label={t("decision")}
          name={IDS.decision}
          value={decision}
          onValueChange={(value) => {
            setDecision(value);
            clear("decision");
            // Eine Regel, die nicht mehr passt, wird geleert statt still falsch gespeichert.
            if (rule && !decisionRules(value, ruleKeys).includes(rule)) setRule(value === "NO_ACTION" ? "R-MOD-0" : "");
            else if (!rule && value === "NO_ACTION") setRule("R-MOD-0");
          }}
          options={decisions.map((choice) => ({ value: choice.value, label: choice.label, description: choice.hint }))}
          error={errorFor("decision")}
        />
      </div>
      <Select
        id={IDS.rule}
        label={t("rule")}
        placeholder={t("rulePlaceholder")}
        hint={t("ruleHint")}
        value={rule || undefined}
        onValueChange={(value) => {
          setRule(value);
          clear("rule");
        }}
        options={rules.map((key) => ({ value: key, label: `${key} ${ruleLabels[key] ?? ""}`.trim() }))}
        error={errorFor("rule")}
      />
      {decision === "ACCOUNT_RESTRICTED" ? (
        <div id={IDS.restrictionKind}>
          <RadioGroup
            label={t("restrictionKind")}
            name={IDS.restrictionKind}
            value={kind}
            onValueChange={(value) => {
              setKind(value as Kind);
              clear("restrictionKind");
            }}
            options={(["MESSAGING", "BOOKING"] as const).map((value) => ({ value, label: t(`kind.${value}`), description: t(`kindHint.${value}`) }))}
            error={errorFor("restrictionKind")}
          />
        </div>
      ) : null}
      {measure ? (
        <DateField
          id={IDS.until}
          label={t("until")}
          optionalLabel={t("optional")}
          hint={t("untilHint")}
          locale={`${locale}-CH`}
          placeholder="TT.MM.JJJJ"
          min={today}
          today={today}
          labels={{ openCalendar: t("calendar.open"), previousMonth: t("calendar.previous"), nextMonth: t("calendar.next"), invalidFormat: errorText("untilInvalid"), outOfRange: errorText("untilPast") }}
          value={until}
          onValueChange={(value) => {
            setUntil(value);
            setUntilText(false);
            clear("until");
          }}
          onBlur={(event) => setUntilText(event.currentTarget.value.trim().length > 0)}
          error={errorFor("until")}
        />
      ) : null}
      <TextArea
        id={IDS.reason}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={4}
        maxLength={REASON_MAX}
        value={reason}
        error={errorFor("reason")}
        onChange={(event) => {
          setReason(event.target.value);
          if (errors.reason && event.target.value.trim().length >= REASON_MIN) clear("reason");
        }}
        onBlur={() => (reason.trim().length > 0 && reason.trim().length < REASON_MIN ? setErrors((current) => ({ ...current, reason: "reasonTooShort" })) : undefined)}
      />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
