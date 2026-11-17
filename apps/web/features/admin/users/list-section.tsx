import { searchUsers, userSearchSchema } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { EmptyState, Select, UiLink } from "@app/ui";
import { Users } from "lucide-react";
import { TextInput } from "../areas/text-input";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { CursorPager, FilterBar, withQuery } from "../areas/filter-bar";
import { adminDates, param } from "../areas/format";
import { Tag } from "../areas/tag";

const FILTERS = userSearchSchema.shape.filter.unwrap().options;

/** Suche und Tabelle `/admin/benutzer` (v1 9.2): Suche und Filter in der URL, 50 pro Seite. */
export async function UserListSection({ locale, actorId, query }: { locale: Locale; actorId: string; query: Record<string, string | string[] | undefined> }) {
  const [t, dates] = await Promise.all([getTranslations({ locale, namespace: "adminUsers" }), adminDates(locale)]);
  const tCommon = await getTranslations({ locale, namespace: "adminCommon" });
  const href = createHref(locale);
  const q = param(query, "q");
  const filterParam = param(query, "filter");
  const filter = FILTERS.find((value) => value === filterParam) ?? "all";
  const cursor = param(query, "cursor");
  const { users, nextCursor } = await searchUsers(actorId, { q, filter, cursor });
  const base = href("/admin/benutzer");
  const active = Boolean(q) || filter !== "all";
  return (
    <div className="flex flex-col gap-4">
      <FilterBar action={base} label={t("list.filterLabel")} submitLabel={tCommon("filters.apply")} resetLabel={tCommon("filters.reset")} resetHref={base} active={active}>
        <TextInput name="q" type="search" label={t("list.search")} hint={t("list.searchHint")} defaultValue={q ?? ""} className="min-w-64" />
        <Select name="filter" label={t("list.filter")} defaultValue={filter} options={FILTERS.map((value) => ({ value, label: t(`filters.${value}`) }))} />
      </FilterBar>
      <p role="status" className="tabular text-small text-ink-muted">
        {cursor ? t("list.countMore", { count: users.length }) : t("list.count", { count: users.length })}
      </p>
      <AdminTable
        testId="users"
        caption={t("list.caption")}
        columns={[
          { id: "user", header: t("columns.user"), priority: 1 },
          { id: "email", header: t("columns.email"), priority: 2 },
          { id: "type", header: t("columns.type") },
          { id: "roles", header: t("columns.roles") },
          { id: "status", header: t("columns.status"), priority: 3 },
          { id: "created", header: t("columns.created") },
        ]}
        rows={users.map((user) => ({
          id: user.id,
          cells: {
            user: (
              <UiLink href={href({ pathname: "/admin/benutzer/[id]", params: { id: user.id } })} className="font-[550] break-words text-ink underline-offset-4 hover:underline" data-user-link={user.id}>
                {user.username ?? t("noUsername")}
              </UiLink>
            ),
            email: <span className="break-all">{user.email}</span>,
            type: t(`accountTypes.${user.accountType}`),
            roles: user.internalRoles.length ? user.internalRoles.map((role) => t(`roles.${role}`)).join(", ") : "–",
            status:
              user.restrictions.length > 0 ? (
                <Tag tone={user.restrictions.includes("SUSPENDED") ? "error" : "warning"}>{user.restrictions.includes("SUSPENDED") ? t("kinds.SUSPENDED") : user.restrictions.map((kind) => t(`kinds.${kind}`)).join(", ")}</Tag>
              ) : user.deactivatedAt ? (
                t("status.deactivated")
              ) : (
                t("status.active")
              ),
            created: dates.date(user.createdAt),
          },
        }))}
        empty={
          <EmptyState
            icon={<Users strokeWidth={1.5} />}
            title={active ? t("list.noMatchTitle") : t("list.emptyTitle")}
            description={active ? t("list.noMatchDescription") : t("list.emptyDescription")}
          />
        }
      />
      <CursorPager
        nextHref={nextCursor ? withQuery(base, { q, filter: filter === "all" ? undefined : filter, cursor: nextCursor }) : null}
        firstHref={cursor ? withQuery(base, { q, filter: filter === "all" ? undefined : filter }) : null}
        nextLabel={tCommon("pager.next")}
        firstLabel={tCommon("pager.first")}
      />
    </div>
  );
}
