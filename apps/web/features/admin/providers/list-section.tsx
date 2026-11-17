import { listProvidersForAdmin, type AdminProviderSummary } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { ProviderStatus } from "@app/db";
import { EmptyState, Select, UiLink } from "@app/ui";
import { UserRound } from "lucide-react";
import { TextInput } from "../areas/text-input";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { CursorPager, FilterBar, withQuery } from "../areas/filter-bar";
import { adminDates, param } from "../areas/format";
import { Tag } from "../areas/tag";

const STATUSES = Object.values(ProviderStatus);
const NAME_KEY = { de: "nameDe", fr: "nameFr", it: "nameIt", en: "nameEn" } as const;

/** Anbieterprofile `/admin/anbieter` (v2 7.8): Status, letzte Prüfung, Regionen, Anlage. */
export async function ProviderListSection({ locale, actorId, query }: { locale: Locale; actorId: string; query: Record<string, string | string[] | undefined> }) {
  const [t, tCommon, tUsers, dates] = await Promise.all([
    getTranslations({ locale, namespace: "adminUsers.providers" }),
    getTranslations({ locale, namespace: "adminCommon" }),
    getTranslations({ locale, namespace: "adminUsers" }),
    adminDates(locale),
  ]);
  const href = createHref(locale);
  const q = param(query, "q");
  const statusParam = param(query, "status");
  const status = STATUSES.find((value) => value === statusParam);
  const cursor = param(query, "cursor");
  const { providers, nextCursor } = await listProvidersForAdmin(actorId, { q, status, cursor });
  const base = href("/admin/anbieter");
  const active = Boolean(q || status);
  const review = (entry: AdminProviderSummary["lastReview"]) => {
    if (!entry) return t("review.none");
    if (!entry.decision) return <Tag tone="warning">{t("review.open")}</Tag>;
    return <Tag tone={entry.decision === "APPROVED" ? "success" : entry.decision === "REJECTED" ? "error" : "warning"}>{t(`review.${entry.decision}`)}</Tag>;
  };
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action={base} label={t("filterLabel")} submitLabel={tCommon("filters.apply")} resetLabel={tCommon("filters.reset")} resetHref={base} active={active}>
        <TextInput name="q" type="search" label={t("search")} hint={t("searchHint")} defaultValue={q ?? ""} className="min-w-64" />
        <Select name="status" label={t("status")} placeholder={t("allStatuses")} defaultValue={status} options={STATUSES.map((value) => ({ value, label: tUsers(`providerStatus.${value}`) }))} />
      </FilterBar>
      <p role="status" className="tabular text-small text-ink-muted">
        {t("count", { count: providers.length })}
      </p>
      <AdminTable
        testId="providers"
        caption={t("caption")}
        columns={[
          { id: "name", header: t("columns.name"), priority: 1 },
          { id: "status", header: t("columns.status"), priority: 2 },
          { id: "review", header: t("columns.review"), priority: 3 },
          { id: "regions", header: t("columns.regions") },
          { id: "created", header: t("columns.created") },
          { id: "profile", header: t("columns.profile") },
        ]}
        rows={providers.map((provider) => ({
          id: provider.id,
          cells: {
            name: (
              <UiLink href={href({ pathname: "/admin/benutzer/[id]", params: { id: provider.userId } })} className="font-[550] break-words text-ink underline-offset-4 hover:underline" data-provider-link={provider.id}>
                {provider.displayName}
              </UiLink>
            ),
            status: tUsers(`providerStatus.${provider.status}`),
            review: review(provider.lastReview),
            regions: provider.regions.length ? provider.regions.map((region) => region[NAME_KEY[locale]]).join(", ") : "–",
            created: dates.date(provider.createdAt),
            profile:
              provider.status === "PUBLISHED" ? (
                <UiLink href={href({ pathname: "/p/[name]", params: { name: provider.slug } })} className="underline underline-offset-4">
                  {t("openProfile")}
                  <span className="sr-only">: {provider.displayName}</span>
                </UiLink>
              ) : (
                "–"
              ),
          },
        }))}
        empty={<EmptyState icon={<UserRound strokeWidth={1.5} />} title={active ? t("noMatchTitle") : t("emptyTitle")} description={active ? t("noMatchDescription") : t("emptyDescription")} />}
      />
      <CursorPager
        nextHref={nextCursor ? withQuery(base, { q, status, cursor: nextCursor }) : null}
        firstHref={cursor ? withQuery(base, { q, status }) : null}
        nextLabel={tCommon("pager.next")}
        firstLabel={tCommon("pager.first")}
      />
    </div>
  );
}
