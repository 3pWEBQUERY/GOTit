import type { Locale } from "@app/core/locale";
import { InlineAlert, UiLink } from "@app/ui";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AdminPageHeader } from "../../admin/components/page-header";
import { caseAge } from "../../admin/queue/case-age";
import { createHref } from "../../shell/nav/href";
import { OrganizationDecisionForm } from "./decision-form";
import type { OrganizationVerificationCase } from "./queries";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-line text-ink">
        {children}
      </dd>
    </div>
  );
}

const UID_REGISTER = "https://www.uid.admin.ch";

/**
 * Einzelfall `/admin/unternehmen/[id]` (v1 FR-VERIFY-003, v2 12.4): Angaben
 * der Organisation und der Einreichung, Entscheid mit Begründung. Die
 * Moderation prüft die UID im öffentlichen UID-Register; Dokumente gibt es nicht.
 */
export async function OrganizationCaseView({
  locale,
  verification,
  alreadyDecided,
  now,
}: {
  locale: Locale;
  verification: OrganizationVerificationCase;
  alreadyDecided: boolean;
  now: Date;
}) {
  const [t, tAdmin, tStatus, format] = await Promise.all([
    getTranslations({ locale, namespace: "organization.admin" }),
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "organization.status" }),
    getFormatter({ locale }),
  ]);
  const href = createHref(locale);
  const { organization } = verification;
  const dateTime = (value: Date) =>
    format.dateTime(value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const age = caseAge(verification.submittedAt, now);
  const ageLabel =
    age.unit === "lessThanHour"
      ? tAdmin("queue.age.lessThanHour")
      : tAdmin(`queue.age.${age.unit}`, { count: age.count });
  const open = verification.status === "SUBMITTED";
  return (
    <>
      <AdminPageHeader
        title={t("caseTitle", { name: organization.name })}
        crumbsLabel={tAdmin("shell.breadcrumbs")}
        crumbs={[
          { label: tAdmin("shell.overview"), href: href("/admin") },
          { label: t("title"), href: href("/admin/unternehmen") },
          { label: organization.name },
        ]}
      />
      <p className="text-small text-ink-muted">
        {t("caseMeta", {
          submitted: dateTime(verification.submittedAt),
          age: ageLabel,
          state: tStatus(`verification.${verification.status}`),
        })}
      </p>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        <section
          aria-labelledby="organisation-einreichung"
          className="flex min-w-0 flex-col gap-2"
        >
          <h2 id="organisation-einreichung" className="text-h3">
            {t("submissionTitle")}
          </h2>
          <dl>
            <Fact label={t("facts.legalName")}>{verification.legalName}</Fact>
            <Fact label={t("facts.uid")}>
              <span className="tabular">{verification.uid}</span>
            </Fact>
            <Fact label={t("facts.authority")}>
              {verification.authorityConfirmed
                ? t("facts.authorityYes")
                : t("facts.authorityNo")}
            </Fact>
            <Fact label={t("facts.permitNote")}>
              {verification.permitNote ?? t("facts.none")}
            </Fact>
          </dl>
          <p className="text-small text-ink-muted">{t("registerHint")}</p>
          <UiLink
            href={UID_REGISTER}
            target="_blank"
            rel="noreferrer"
            className="self-start text-body text-ink underline underline-offset-4"
          >
            {t("registerLink")}
          </UiLink>
        </section>
        <section
          aria-labelledby="organisation-profil"
          className="flex min-w-0 flex-col gap-2"
        >
          <h2 id="organisation-profil" className="text-h3">
            {t("profileTitle")}
          </h2>
          <dl>
            <Fact label={t("facts.name")}>{organization.name}</Fact>
            <Fact label={t("facts.kind")}>
              {t(`kinds.${organization.kind}`)}
            </Fact>
            <Fact label={t("facts.status")}>
              {tStatus(`organization.${organization.status}`)}
            </Fact>
            <Fact label={t("facts.website")}>
              {organization.website ?? t("facts.none")}
            </Fact>
            <Fact label={t("facts.description")}>
              {organization.description ?? t("facts.none")}
            </Fact>
          </dl>
        </section>
        <section
          aria-labelledby="organisation-entscheid-titel"
          className="flex min-w-0 flex-col gap-4 lg:col-span-2 xl:col-span-1"
        >
          <h2 id="organisation-entscheid-titel" className="text-h3">
            {t("decision.title")}
          </h2>
          {alreadyDecided ? (
            <InlineAlert
              tone="warning"
              title={t("decision.errors.alreadyDecided")}
            >
              {tAdmin("decision.alreadyDecidedHelp")}
            </InlineAlert>
          ) : null}
          {open ? (
            <>
              <div className="hidden lg:block">
                <OrganizationDecisionForm
                  id={verification.id}
                  queueHref={href("/admin/unternehmen")}
                />
              </div>
              <div className="lg:hidden">
                <InlineAlert title={tAdmin("decision.readOnlyTitle")}>
                  {tAdmin("decision.readOnlyDescription")}
                </InlineAlert>
              </div>
            </>
          ) : (
            <dl data-organization-decision-readonly>
              <Fact label={t("decision.result")}>
                {tStatus(`verification.${verification.status}`)}
              </Fact>
              {verification.decidedAt ? (
                <Fact label={t("decision.decidedAt")}>
                  {dateTime(verification.decidedAt)}
                </Fact>
              ) : null}
              {verification.reason ? (
                <Fact label={t("decision.reason")}>{verification.reason}</Fact>
              ) : null}
            </dl>
          )}
        </section>
      </div>
    </>
  );
}
