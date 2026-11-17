"use client";

import { Button, InlineAlert, TextArea } from "@app/ui";
import { EyeOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { revealEvidence, type EvidenceMessage } from "../actions/reveal-report-evidence";
import { useAdminErrorText } from "../case/use-admin-error-text";

const REASON_ID = "kopie-grund";

/**
 * Kopie der gemeldeten Nachrichten (PRD v2 12.4): zuerst verdeckt. Die Texte
 * kommen erst nach dem Aufdecken mit Grund vom Server; der Kern schreibt dazu
 * einen Audit-Eintrag. «Wieder verdecken» entfernt sie aus der Ansicht.
 */
export function EvidencePanel({ reportId, count }: { reportId: string; count: number }) {
  const t = useTranslations("admin.reports.evidence");
  const errorText = useAdminErrorText();
  const format = useFormatter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<EvidenceMessage[] | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setError("revealReasonTooShort");
      document.getElementById(REASON_ID)?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await revealEvidence({ reportId, reason });
      if (result.ok) {
        setMessages(result.data?.messages ?? []);
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

  const date = (iso: string) => format.dateTime(new Date(iso), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <section aria-labelledby="meldung-kopie" className="flex min-w-0 flex-col gap-4">
      <h2 id="meldung-kopie" className="text-h3">
        {t("title")}
      </h2>
      {count === 0 ? (
        <InlineAlert title={t("none")} />
      ) : messages === null ? (
        <div className="flex flex-col gap-4 rounded-control bg-surface-2 p-4" data-evidence="hidden">
          <div className="flex items-start gap-3">
            <EyeOff aria-hidden strokeWidth={1.5} className="mt-0.5 size-5 shrink-0 text-ink-muted" />
            <p className="max-w-prose text-small text-ink-muted">{t("hidden", { count })}</p>
          </div>
          <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
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
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-evidence="shown">
          <ol aria-label={t("listLabel")} className="flex flex-col divide-y divide-border border-y border-border">
            {messages.map((message) => (
              <li key={message.id} className="flex flex-col gap-1 py-3">
                <time dateTime={message.sentAt} className="tabular text-label text-ink-muted">
                  {date(message.sentAt)}
                </time>
                <p className="text-body break-words whitespace-pre-wrap text-ink">{message.body ?? <span className="text-ink-muted">{t("noText")}</span>}</p>
              </li>
            ))}
          </ol>
          <p className="text-small text-ink-muted">{t("audited")}</p>
          <Button variant="secondary" icon={<EyeOff aria-hidden strokeWidth={1.5} />} className="self-start" onClick={() => setMessages(null)}>
            {t("hide")}
          </Button>
        </div>
      )}
    </section>
  );
}
