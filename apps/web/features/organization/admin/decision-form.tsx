"use client";

import { Button, InlineAlert, RadioGroup, TextArea, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorSummary } from "../components/error-summary";
import { decideOrganizationAction } from "./decide";

const DECISIONS = ["APPROVED", "CHANGES_REQUESTED", "REJECTED"] as const;
const IDS = {
  decision: "organisation-entscheid",
  reason: "organisation-begruendung",
} as const;

/** Entscheid mit Begründung (mindestens 10 Zeichen); danach zum nächsten Fall oder zurück zur Warteschlange. */
export function OrganizationDecisionForm({
  id,
  queueHref,
}: {
  id: string;
  queueHref: string;
}) {
  const t = useTranslations("organization.admin.decision");
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [decision, setDecision] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    const result = await decideOrganizationAction(id, {
      decision,
      reason,
    }).catch(() => ({
      ok: false as const,
      formError: "generic",
      fieldErrors: undefined,
    }));
    setPending(false);
    if (result.ok) {
      toast({ title: t("saved"), tone: "success" });
      router.push(result.nextId ? `${queueHref}/${result.nextId}` : queueHref);
      return;
    }
    if (result.formError === "alreadyDecided") {
      router.replace(`${pathname}?hinweis=entschieden`);
      router.refresh();
      return;
    }
    setErrors(result.fieldErrors ?? {});
    setFormError(result.formError ?? null);
    const first = Object.keys(result.fieldErrors ?? {})[0] as
      | keyof typeof IDS
      | undefined;
    if (first)
      requestAnimationFrame(() => {
        const element = document.getElementById(IDS[first]);
        (
          element?.querySelector<HTMLElement>("[role=radio]") ?? element
        )?.focus();
      });
  }

  const errorFor = (key: string) =>
    errors[key] ? t(`errors.${errors[key]}`) : undefined;
  const summary = Object.keys(errors).map((key) => ({
    fieldId: IDS[key as keyof typeof IDS] ?? IDS.decision,
    message: errorFor(key) ?? "",
  }));

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-6"
      data-organization-decision-form
    >
      <ErrorSummary items={summary} />
      {formError ? (
        <InlineAlert tone="error" title={t(`errors.${formError}`)} />
      ) : null}
      <div id={IDS.decision}>
        <RadioGroup
          label={t("decision")}
          name="organisation-entscheid"
          value={decision}
          onValueChange={(value) => {
            setDecision(value);
            setErrors(({ decision: _removed, ...rest }) => rest);
          }}
          options={DECISIONS.map((value) => ({
            value,
            label: t(`option.${value}`),
            description: t(`optionHint.${value}`),
          }))}
          error={errorFor("decision")}
        />
      </div>
      <TextArea
        id={IDS.reason}
        label={t("reason")}
        hint={t("reasonHint")}
        rows={4}
        maxLength={1000}
        value={reason}
        error={errorFor("reason")}
        onChange={(event) => setReason(event.target.value)}
      />
      <Button
        type="submit"
        variant="primary"
        loading={pending}
        className="self-start"
      >
        {t("save")}
      </Button>
    </form>
  );
}
