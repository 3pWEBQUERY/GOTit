import type { Locale } from "@app/core/locale";
import { getFormatter, getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminPageHeader } from "../components/page-header";
import type { ReviewCase } from "../queries/get-case";
import { caseAge } from "../queue/case-age";
import { CaseFacts } from "./case-facts";
import { ChangeComparison } from "./change-comparison";
import { DecisionPanel } from "./decision-panel";
import { IdentityPanel } from "./identity-panel";

/** Einzelfall in drei Spalten (PRD 12.4): Angaben, Prüfdetails, Entscheid. */
export async function CaseView({ locale, review, alreadyDecided, now }: { locale: Locale; review: ReviewCase; alreadyDecided: boolean; now: Date }) {
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "admin" }), getFormatter({ locale })]);
  const href = createHref(locale);
  const age = caseAge(review.submittedAt, now);
  const submitted = format.dateTime(review.submittedAt, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const ageLabel = age.unit === "lessThanHour" ? t("queue.age.lessThanHour") : t(`queue.age.${age.unit}`, { count: age.count });
  const state = review.decision ? t(`case.decisionLabel.${review.decision}`) : t("case.decisionLabel.open");

  return (
    <>
      <AdminPageHeader
        title={t(review.kind === "CHANGE" ? "case.changeTitle" : "case.title", { name: review.providerProfile.displayName })}
        crumbsLabel={t("shell.breadcrumbs")}
        crumbs={[
          { label: t("shell.overview"), href: href("/admin") },
          { label: t("shell.verifications"), href: href("/admin/verifizierungen") },
          { label: review.providerProfile.displayName },
        ]}
      />
      <p className="text-small text-ink-muted">
        {t("case.meta", { submitted, age: ageLabel, state })}
      </p>
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-8">
          {review.kind === "CHANGE" && review.decision === null ? <ChangeComparison locale={locale} review={review} /> : null}
          <CaseFacts locale={locale} review={review} />
        </div>
        <IdentityPanel reviewId={review.id} />
        <div className="lg:col-span-2 xl:col-span-1">
          <DecisionPanel locale={locale} review={review} alreadyDecided={alreadyDecided} />
        </div>
      </div>
    </>
  );
}
