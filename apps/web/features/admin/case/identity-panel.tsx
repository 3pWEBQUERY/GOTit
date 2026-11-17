"use client";

import { Button, InlineAlert, TextArea } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { revealIdentity, type IdentityDetails } from "../actions/reveal-identity";
import { useAdminErrorText } from "./use-admin-error-text";

const REASON_ID = "aufdecken-grund";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
}

/**
 * Mittlere Spalte: Prüfdetails der Identität, standardmässig verdeckt
 * (PRD 12.4). Aufdecken verlangt einen Grund und erzeugt einen Audit-Eintrag.
 */
export function IdentityPanel({ reviewId }: { reviewId: string }) {
  const t = useTranslations("admin.identity");
  const errorText = useAdminErrorText();
  const format = useFormatter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [details, setDetails] = useState<IdentityDetails | null | undefined>(undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setError("revealReasonTooShort");
      document.getElementById(REASON_ID)?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await revealIdentity({ reviewId, reason });
      if (result.ok) {
        setDetails(result.data?.details ?? null);
        setError(null);
        setFormError(null);
      } else {
        setError(result.fieldErrors?.reason ?? null);
        setFormError(result.formError ?? null);
        if (result.fieldErrors?.reason) document.getElementById(REASON_ID)?.focus();
      }
    } catch {
      setFormError("generic");
    } finally {
      setPending(false);
    }
  }

  const date = (iso: string | null) =>
    iso ? format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : t("unknown");
  const yesNo = (value: boolean | null, yes: string, no: string) => (value === null ? t("unknown") : value ? yes : no);

  return (
    <section aria-labelledby="pruefdetails" className="flex min-w-0 flex-col gap-4">
      <h2 id="pruefdetails" className="text-h3">
        {t("title")}
      </h2>
      {details === undefined ? (
        <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4" data-identity-hidden>
          <p className="text-small text-ink-muted">{t("hidden")}</p>
          {formError ? <InlineAlert tone="error" title={errorText(formError)} /> : null}
          <TextArea
            id={REASON_ID}
            label={t("reason")}
            hint={t("reasonHint")}
            rows={3}
            maxLength={500}
            value={reason}
            error={error ? errorText(error) : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button type="submit" loading={pending} className="self-start">
            {t("reveal")}
          </Button>
        </form>
      ) : details === null ? (
        <InlineAlert tone="warning" title={t("noCheck")} />
      ) : (
        <div className="flex flex-col gap-3" data-identity-details>
          <InlineAlert tone={details.valid ? "success" : "warning"} title={details.valid ? t("valid") : t("invalid")} />
          <dl>
            <Row label={t("status")}>{t(`statusLabel.${details.status}`)}</Row>
            <Row label={t("adult")}>{yesNo(details.ageOver18, t("adultYes"), t("adultNo"))}</Row>
            <Row label={t("liveness")}>{yesNo(details.livenessPassed, t("passed"), t("notPassed"))}</Row>
            <Row label={t("checkedAt")}>{date(details.checkedAt)}</Row>
            <Row label={t("expiresAt")}>{date(details.expiresAt)}</Row>
            <Row label={t("provider")}>{details.provider}</Row>
            {details.failureReason ? <Row label={t("failureReason")}>{details.failureReason}</Row> : null}
          </dl>
          <p className="text-small text-ink-muted">{t("audited")}</p>
        </div>
      )}
    </section>
  );
}
