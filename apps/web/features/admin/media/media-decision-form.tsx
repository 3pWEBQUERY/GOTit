"use client";

import { Button, RadioGroup, Select, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormErrorSummary, type SummaryEntry } from "../../settings/components/form-error-summary";
import { decideMediaCase } from "../actions/decide-media";
import { useAdminErrorText } from "../case/use-admin-error-text";
import { MEDIA_DECISION_OPTIONS, MEDIA_RULES, type MediaDecisionOption } from "./media-rules";

const IDS = { decision: "medium-entscheid", reason: "medium-begruendung", rule: "medium-regel" } as const;

/** Entscheid mit Begründung und Regel; danach zum nächsten Medium in Prüfung oder zurück zur Warteschlange. */
export function MediaDecisionForm({ mediaId, queueHref }: { mediaId: string; queueHref: string }) {
  const t = useTranslations("admin.media.decision");
  const tRules = useTranslations("admin.media.rules");
  const errorText = useAdminErrorText();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [decision, setDecision] = useState<MediaDecisionOption | "">("");
  const [reason, setReason] = useState("");
  const [rule, setRule] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await decideMediaCase({ mediaId, decision: decision || undefined, reason, rule: rule || undefined });
      if (result.ok) {
        toast({ title: t("saved"), tone: "success" });
        const nextId = result.data?.nextId;
        router.push(nextId ? `${queueHref}/${nextId}` : queueHref);
        return;
      }
      if (result.formError === "mediaAlreadyDecided") {
        router.replace(`${pathname}?hinweis=entschieden`);
        router.refresh();
        return;
      }
      const fieldErrors = result.fieldErrors ?? {};
      setErrors(fieldErrors);
      setFormError(result.formError ?? null);
      const first = Object.keys(fieldErrors)[0] as keyof typeof IDS | undefined;
      if (first) requestAnimationFrame(() => {
        const element = document.getElementById(IDS[first] ?? IDS.decision);
        (element?.querySelector<HTMLElement>("[role=radio]") ?? element)?.focus();
      });
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const summary: SummaryEntry[] = Object.entries(errors).map(([key, message]) => ({ fieldId: IDS[key as keyof typeof IDS] ?? IDS.decision, message: errorText(message) }));
  const errorFor = (key: string) => (errors[key] ? errorText(errors[key]) : undefined);

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6" data-media-decision-form>
      <FormErrorSummary title={t("summaryTitle")} entries={summary} formError={formError ? errorText(formError) : null} />
      <div id={IDS.decision}>
        <RadioGroup
          label={t("decision")}
          name="medium-entscheid"
          value={decision}
          onValueChange={(value) => {
            setDecision(value as MediaDecisionOption);
            setErrors(({ decision: _removed, ...rest }) => rest);
          }}
          options={MEDIA_DECISION_OPTIONS.map((value) => ({ value, label: t(`option.${value}`), description: t(`optionHint.${value}`) }))}
          error={errorFor("decision")}
        />
      </div>
      <TextArea id={IDS.reason} label={t("reason")} hint={t("reasonHint")} rows={4} maxLength={2000} value={reason} error={errorFor("reason")} onChange={(event) => setReason(event.target.value)} />
      <Select
        id={IDS.rule}
        label={t("rule")}
        placeholder={t("rulePlaceholder")}
        value={rule || undefined}
        onValueChange={(value) => {
          setRule(value);
          setErrors(({ rule: _removed, ...rest }) => rest);
        }}
        options={MEDIA_RULES.map((entry) => ({ value: entry.id, label: `${entry.id} ${tRules(entry.key)}` }))}
        error={errorFor("rule")}
      />
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {t("save")}
      </Button>
    </form>
  );
}
