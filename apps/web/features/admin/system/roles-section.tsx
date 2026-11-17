import { listInternalStaff, searchUsers } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { Button, EmptyState, InlineAlert, UiLink } from "@app/ui";
import { ShieldCheck } from "lucide-react";
import { TextInput } from "../areas/text-input";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminTable } from "../areas/admin-table";
import { Section } from "../areas/facts";
import { FilterBar } from "../areas/filter-bar";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { RolesForm } from "../users/roles-form";

/**
 * Interne Rollen (v2 7.8 `/admin/system/rollen`, nur Super-Admin): wer welche
 * Rolle hat; `?konto=<id>` öffnet die Bearbeitung, `?q=` sucht ein Konto ohne
 * Rolle. Jede Änderung braucht eine Begründung und steht im Audit-Log.
 */
export async function RolesSection({ locale, actorId, accountId, q }: { locale: Locale; actorId: string; accountId?: string; q?: string }) {
  const [t, tUsers, tCommon, dates, staff] = await Promise.all([
    getTranslations({ locale, namespace: "adminSystem.roles" }),
    getTranslations({ locale, namespace: "adminUsers" }),
    getTranslations({ locale, namespace: "adminCommon" }),
    adminDates(locale),
    listInternalStaff(actorId),
  ]);
  const href = createHref(locale);
  const base = href("/admin/system/rollen");
  const editHref = (id: string) => `${base}?konto=${encodeURIComponent(id)}`;
  const fromStaff = accountId ? staff.find((entry) => entry.id === accountId) : undefined;
  const found = accountId && !fromStaff ? (await searchUsers(actorId, { q: accountId })).users.find((user) => user.id === accountId) : undefined;
  const editing = fromStaff ? { id: fromStaff.id, name: fromStaff.username ?? fromStaff.email, roles: fromStaff.roles.map((entry) => entry.role) } : found ? { id: found.id, name: found.username ?? found.email, roles: found.internalRoles } : null;
  const results = q ? (await searchUsers(actorId, { q })).users.slice(0, 10) : [];
  return (
    <div className="flex flex-col gap-6">
      {accountId && !editing ? <InlineAlert tone="warning" title={t("unknownAccount")} /> : null}
      {editing ? (
        <Section id="rollen-bearbeiten" title={t("editTitle", { name: editing.name })} intro={t("editIntro")}>
          <WideOnly locale={locale}>
            <RolesForm key={editing.id} locale={locale} userId={editing.id} current={editing.roles} />
          </WideOnly>
          <Button asChild variant="quiet" className="self-start">
            <UiLink href={base}>{t("close")}</UiLink>
          </Button>
        </Section>
      ) : null}
      <AdminTable
        testId="staff"
        caption={t("caption")}
        columns={[
          { id: "user", header: tUsers("columns.user"), priority: 1 },
          { id: "roles", header: tUsers("columns.roles"), priority: 2 },
          { id: "twoFactor", header: t("twoFactor"), priority: 3 },
          { id: "granted", header: t("granted") },
          { id: "edit", header: t("edit") },
        ]}
        rows={staff.map((entry) => ({
          id: entry.id,
          cells: {
            user: (
              <UiLink href={href({ pathname: "/admin/benutzer/[id]", params: { id: entry.id } })} className="font-[550] break-words text-ink underline-offset-4 hover:underline">
                {entry.username ?? entry.email}
              </UiLink>
            ),
            roles: entry.roles.map((role) => tUsers(`roles.${role.role}`)).join(", "),
            twoFactor: entry.twoFactorEnabled ? t("twoFactorOn") : <Tag tone="warning">{t("twoFactorOff")}</Tag>,
            granted: entry.roles.length ? dates.date(entry.roles.reduce((latest, role) => (role.grantedAt > latest ? role.grantedAt : latest), entry.roles[0]?.grantedAt ?? new Date(0))) : "–",
            edit: (
              <UiLink href={editHref(entry.id)} className="underline underline-offset-4" data-roles-edit={entry.id}>
                {t("editLink")}
                <span className="sr-only">: {entry.username ?? entry.email}</span>
              </UiLink>
            ),
          },
        }))}
        empty={<EmptyState icon={<ShieldCheck strokeWidth={1.5} />} title={t("emptyTitle")} description={t("emptyDescription")} />}
      />
      <Section id="konto-suchen" title={t("searchTitle")} intro={t("searchIntro")}>
        <FilterBar action={base} label={t("searchTitle")} submitLabel={t("searchSubmit")} resetLabel={tCommon("filters.reset")} resetHref={base} active={Boolean(q)}>
          <TextInput name="q" type="search" label={t("search")} hint={t("searchHint")} defaultValue={q ?? ""} className="min-w-64" />
        </FilterBar>
        {q ? (
          results.length ? (
            <ul className="flex flex-col gap-1">
              {results.map((user) => (
                <li key={user.id} className="text-body">
                  <UiLink href={editHref(user.id)} className="underline underline-offset-4">
                    {user.username ?? user.email}
                  </UiLink>{" "}
                  · {user.internalRoles.length ? user.internalRoles.map((role) => tUsers(`roles.${role}`)).join(", ") : t("noRole")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-muted">{t("noResults")}</p>
          )
        ) : null}
      </Section>
    </div>
  );
}
