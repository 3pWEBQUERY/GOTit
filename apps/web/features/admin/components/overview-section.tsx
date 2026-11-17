import type { Locale } from "@app/core/locale";
import { Button, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { canReview, getAdminContext } from "../access";
import { countOpenCases } from "../queries/get-queue";
import { AdminPageHeader } from "./page-header";

/** Plattformübersicht: offene Prüffälle und ein ehrlicher Satz zu dem, was noch folgt. */
export async function OverviewSection({ locale }: { locale: Locale }) {
  const [t, { actor }, open] = await Promise.all([getTranslations({ locale, namespace: "admin.overview" }), getAdminContext(), countOpenCases()]);
  const reviewer = canReview(actor);
  return (
    <>
      <AdminPageHeader title={t("title")} />
      <section aria-labelledby="offene-faelle" className="flex flex-col gap-3 border-b border-border pb-6">
        <h2 id="offene-faelle" className="text-h3">
          {t("openTitle")}
        </h2>
        <p className="text-body text-ink">
          <span className="tabular text-h2" data-open-count>
            {open}
          </span>{" "}
          <span className="text-ink-muted">{t("openUnit", { count: open })}</span>
        </p>
        {reviewer ? (
          <Button asChild variant={open > 0 ? "primary" : "secondary"} className="self-start">
            <UiLink href={createHref(locale)("/admin/verifizierungen")}>{t("openQueue")}</UiLink>
          </Button>
        ) : (
          <p className="text-small text-ink-muted">{t("reviewOnly")}</p>
        )}
      </section>
      <p className="max-w-prose text-body text-ink-muted">{t("upcoming")}</p>
    </>
  );
}
