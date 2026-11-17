import type { Locale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import { loadOwnOrganization } from "../queries/membership";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";
import { VerificationForm } from "./verification-form";

const TONE = {
  SUBMITTED: "info",
  APPROVED: "success",
  CHANGES_REQUESTED: "warning",
  REJECTED: "error",
} as const;

/**
 * `/studio/o/[org]/nachweise` (v2 7.7, v1 FR-VERIFY-003): Stand der Prüfung
 * mit Begründung, darunter das Formular. Während einer offenen Prüfung gibt es
 * keine zweite Einreichung; danach führen geänderte Angaben zu einer neuen.
 */
export async function VerificationPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const [{ context, verification }, t, tStatus, format] = await Promise.all([
    loadOwnOrganization(slug),
    getTranslations({ locale, namespace: "organization.credentials" }),
    getTranslations({ locale, namespace: "organization.status" }),
    getFormatter({ locale }),
  ]);
  const date = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  const canSubmit = context.can("verification.submit");
  const open = verification?.status === "SUBMITTED";
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading title={t("title")} intro={t("intro")} />
      <section
        aria-labelledby="nachweis-stand"
        className="flex max-w-reading flex-col gap-3"
      >
        <h2 id="nachweis-stand" className="text-h3">
          {t("stateTitle")}
        </h2>
        {verification ? (
          <div data-verification-state={verification.status}>
            <InlineAlert
              tone={TONE[verification.status]}
              title={tStatus(`verification.${verification.status}`)}
            >
              <p>
                {verification.decidedAt
                  ? t("decidedOn", {
                      submitted: date(verification.submittedAt),
                      decided: date(verification.decidedAt),
                    })
                  : t("submittedOn", { date: date(verification.submittedAt) })}
              </p>
              {verification.reason && verification.status !== "APPROVED" ? (
                <p
                  className="mt-2 break-words whitespace-pre-line"
                  data-verification-reason
                >
                  {t("reason", { reason: verification.reason })}
                </p>
              ) : null}
              {open ? <p className="mt-2">{t("openHint")}</p> : null}
            </InlineAlert>
          </div>
        ) : (
          <p
            className="text-body text-ink-muted"
            data-verification-state="NONE"
          >
            {t("none")}
          </p>
        )}
      </section>
      <section
        aria-labelledby="nachweis-datenschutz"
        className="flex max-w-reading flex-col gap-2"
      >
        <h2 id="nachweis-datenschutz" className="text-h3">
          {t("howTitle")}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body text-ink">
          <li>{t("howRegister")}</li>
          <li>{t("howNoDocuments")}</li>
          <li>{t("howChanges")}</li>
        </ul>
      </section>
      {!canSubmit ? <PermissionNote text={t("noPermission")} /> : null}
      {canSubmit && !open ? (
        <section
          aria-labelledby="nachweis-formular"
          className="flex flex-col gap-3"
        >
          <h2 id="nachweis-formular" className="text-h3">
            {verification ? t("formTitleAgain") : t("formTitle")}
          </h2>
          <VerificationForm
            slug={slug}
            submitLabel={verification ? t("submitAgain") : t("submit")}
            initial={{
              legalName: verification?.legalName ?? "",
              uid: verification?.uid ?? "",
              authorityConfirmed: false,
              permitNote: verification?.permitNote ?? "",
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
