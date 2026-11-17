import { hasPermission, type AdminActor, type AdminUserDetail } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { MODERATION_RULE_KEYS } from "@app/core/moderation";
import { Button, InlineAlert, UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { AdminForm } from "../areas/admin-form";
import { AdminTable } from "../areas/admin-table";
import { Facts, Section } from "../areas/facts";
import { adminDates } from "../areas/format";
import { Tag } from "../areas/tag";
import { WideOnly } from "../areas/wide-only";
import { AdminPageHeader } from "../components/page-header";
import { liftRestrictionAction, restrictAccountAction } from "./actions";
import { RolesForm } from "./roles-form";

const RULES = MODERATION_RULE_KEYS.filter((key) => key !== "R-MOD-0");

/**
 * Detailansicht `/admin/benutzer/[id]` (v1 9.2): Konto, Rollen, Profil,
 * Organisationen, Verlauf der Einschränkungen mit Einschränken, Sperren und
 * Aufheben. Formulare erscheinen nur mit passendem Recht.
 */
export async function UserDetailView({ locale, actor, user, today }: { locale: Locale; actor: AdminActor; user: AdminUserDetail; today: string }) {
  const [t, tCommon, tRules, dates] = await Promise.all([
    getTranslations({ locale, namespace: "adminUsers" }),
    getTranslations({ locale, namespace: "adminCommon" }),
    getTranslations({ locale, namespace: "moderation.rules" }),
    adminDates(locale),
  ]);
  const href = createHref(locale);
  const canRestrict = hasPermission(actor, "users.restrict");
  const canSuspend = hasPermission(actor, "users.suspend");
  const canManageRoles = hasPermission(actor, "roles.manage");
  const name = user.username ?? t("noUsername");
  const ruleOptions = RULES.map((key) => ({ value: key, label: `${key} ${tRules(key)}` }));
  const suspended = user.restrictions.includes("SUSPENDED");
  const status = suspended
    ? t("kinds.SUSPENDED")
    : user.restrictions.length
      ? user.restrictions.map((kind) => t(`kinds.${kind}`)).join(", ")
      : user.deactivatedAt
        ? t("status.deactivated")
        : t("status.active");
  const appealsHref = href({ pathname: "/admin/moderation", query: { ansicht: "sperren" } });
  const openAppeals = user.restrictionHistory.filter((entry) => entry.appealStatus === "OPEN").length;

  const restrictionStatus = (entry: AdminUserDetail["restrictionHistory"][number]) => {
    if (entry.active) return <Tag tone={entry.kind === "SUSPENDED" ? "error" : "warning"}>{t("history.active")}</Tag>;
    if (entry.liftedAt) return t("history.lifted", { date: dates.dateTime(entry.liftedAt) });
    return t("history.expired");
  };

  return (
    <>
      <AdminPageHeader
        title={name}
        crumbsLabel={tCommon("breadcrumbs")}
        crumbs={[
          { label: tCommon("areas.overview"), href: href("/admin") },
          { label: tCommon("areas.users"), href: href("/admin/benutzer") },
          { label: name },
        ]}
      />
      {suspended ? <InlineAlert tone="warning" title={t("detail.suspendedTitle")}>{t("detail.suspendedText")}</InlineAlert> : null}

      <Section id="konto" title={t("detail.account")}>
        <Facts
          items={[
            { label: t("columns.user"), value: name },
            { label: t("columns.email"), value: user.email },
            { label: t("columns.type"), value: t(`accountTypes.${user.accountType}`) },
            { label: t("columns.status"), value: status },
            { label: t("columns.created"), value: dates.dateTime(user.createdAt) },
            { label: t("detail.twoFactor"), value: user.twoFactorEnabled ? t("detail.twoFactorOn") : t("detail.twoFactorOff") },
            ...(user.deletionRequestedAt ? [{ label: t("detail.deletionRequested"), value: dates.dateTime(user.deletionRequestedAt) }] : []),
            { label: t("detail.reports"), value: t("detail.reportCount", { count: user.reportCount }) },
            { label: t("detail.id"), value: <code className="text-small break-all">{user.id}</code> },
          ]}
        />
      </Section>

      {user.identityCheck ? (
        <Section id="identitaet" title={t("detail.identity")} intro={t("detail.identityIntro")}>
          {user.identityCheck.latest ? (
            <Facts
              items={[
                { label: t("detail.identityStatus"), value: t(`identity.${user.identityCheck.latest.status}`) },
                { label: t("detail.identityChecked"), value: user.identityCheck.latest.checkedAt ? dates.date(user.identityCheck.latest.checkedAt) : "–" },
                { label: t("detail.identityExpires"), value: user.identityCheck.latest.expiresAt ? dates.date(user.identityCheck.latest.expiresAt) : "–" },
              ]}
            />
          ) : (
            <p className="text-body text-ink-muted">{t("detail.identityNone")}</p>
          )}
        </Section>
      ) : null}

      <Section id="rollen" title={t("detail.roles")}>
        <p className="text-body">{user.internalRoles.length ? user.internalRoles.map((role) => t(`roles.${role}`)).join(", ") : t("detail.noRoles")}</p>
        {canManageRoles ? (
          <WideOnly locale={locale}>
            <RolesForm locale={locale} userId={user.id} current={user.internalRoles} />
          </WideOnly>
        ) : (
          <p className="text-small text-ink-muted">{t("detail.rolesOnlySuper")}</p>
        )}
      </Section>

      <Section id="profil" title={t("detail.profile")}>
        {user.providerProfile ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-body">
              {user.providerProfile.displayName} · {t(`providerStatus.${user.providerProfile.status}`)}
            </p>
            <Button asChild variant="secondary">
              <UiLink href={href({ pathname: "/p/[name]", params: { name: user.providerProfile.slug } })}>{t("detail.openProfile")}</UiLink>
            </Button>
            <Button asChild variant="quiet">
              <UiLink href={href({ pathname: "/admin/anbieter", query: { q: user.providerProfile.slug } })}>{t("detail.inProviders")}</UiLink>
            </Button>
          </div>
        ) : (
          <p className="text-body text-ink-muted">{t("detail.noProfile")}</p>
        )}
        {user.organizations.length ? (
          <ul className="flex flex-col gap-2">
            {user.organizations.map((organization) => (
              <li key={organization.slug} className="text-body">
                <UiLink href={href({ pathname: "/c/[slug]", params: { slug: organization.slug } })} className="underline underline-offset-4">
                  {organization.name}
                </UiLink>{" "}
                · {t(`orgRoles.${organization.role}`)} · {t(`orgStatus.${organization.status}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">{t("detail.noOrganizations")}</p>
        )}
      </Section>

      <Section id="einschraenkungen" title={t("detail.restrictions")} intro={t("detail.restrictionsIntro")}>
        {openAppeals > 0 ? (
          <InlineAlert
            tone="info"
            title={t("detail.openAppeals", { count: openAppeals })}
            action={
              <Button asChild variant="secondary">
                <UiLink href={appealsHref}>{t("detail.toAppeals")}</UiLink>
              </Button>
            }
          />
        ) : null}
        <AdminTable
          testId="restrictions"
          caption={t("detail.restrictions")}
          columns={[
            { id: "kind", header: t("history.kind"), priority: 1 },
            { id: "rule", header: t("history.rule") },
            { id: "reason", header: t("history.reason"), priority: 3 },
            { id: "period", header: t("history.period") },
            { id: "status", header: t("history.status"), priority: 2 },
            { id: "appeal", header: t("history.appeal") },
          ]}
          rows={user.restrictionHistory.map((entry) => ({
            id: entry.id,
            cells: {
              kind: t(`kinds.${entry.kind}`),
              rule: (MODERATION_RULE_KEYS as readonly string[]).includes(entry.rule) ? `${entry.rule} ${tRules(entry.rule as (typeof RULES)[number])}` : entry.rule,
              reason: <span className="break-words">{entry.reason}</span>,
              period: entry.until ? t("history.fromUntil", { from: dates.date(entry.createdAt), until: dates.dateTime(entry.until) }) : t("history.fromOpen", { from: dates.date(entry.createdAt) }),
              status: restrictionStatus(entry),
              appeal: entry.appealStatus === "NONE" ? "–" : t(`appeal.${entry.appealStatus}`),
            },
          }))}
          empty={<p className="text-body text-ink-muted">{t("detail.noRestrictions")}</p>}
        />
        {user.restrictionHistory
          .filter((entry) => entry.active && (entry.kind === "SUSPENDED" ? canSuspend : canRestrict))
          .map((entry) => (
            <WideOnly key={entry.id} locale={locale}>
              <div className="flex flex-col gap-3 rounded-card border border-border p-4" data-lift={entry.id}>
                <h3 className="text-h3">{t("lift.title", { kind: t(`kinds.${entry.kind}`) })}</h3>
                <AdminForm
                  id={`aufheben-${entry.id}`}
                  action={liftRestrictionAction.bind(null, entry.id)}
                  fields={[{ kind: "textarea", name: "reason", label: t("lift.reason"), hint: t("lift.reasonHint"), minLength: 10, maxLength: 1000, rows: 3 }]}
                  submitLabel={t("lift.submit")}
                  submitVariant="secondary"
                  successMessage={t("lift.saved")}
                />
              </div>
            </WideOnly>
          ))}
      </Section>

      {canRestrict || canSuspend ? (
        <Section id="massnahmen" title={t("measures.title")}>
          <WideOnly locale={locale}>
            <div className="grid gap-6 xl:grid-cols-2">
              {canRestrict ? (
                <div className="flex flex-col gap-3 rounded-card border border-border p-4" data-restrict-form>
                  <h3 className="text-h3">{t("measures.restrictTitle")}</h3>
                  <p className="text-small text-ink-muted">{t("measures.restrictIntro")}</p>
                  <AdminForm
                    id="einschraenken"
                    action={restrictAccountAction.bind(null, user.id, "LIMIT")}
                    fields={[
                      { kind: "radio", name: "kind", label: t("measures.kind"), options: (["MESSAGING", "BOOKING"] as const).map((kind) => ({ value: kind, label: t(`kinds.${kind}`), description: t(`kindHints.${kind}`) })) },
                      { kind: "select", name: "rule", label: t("measures.rule"), hint: t("measures.ruleHint"), options: ruleOptions },
                      { kind: "textarea", name: "reason", label: t("measures.reason"), hint: t("measures.reasonHint"), minLength: 10, maxLength: 1000, rows: 3 },
                      { kind: "date", name: "until", label: t("measures.until"), hint: t("measures.untilHint"), optional: true, min: today },
                    ]}
                    submitLabel={t("measures.restrictSubmit")}
                    successMessage={t("measures.restricted")}
                    resetOnSuccess
                  />
                </div>
              ) : null}
              {canSuspend && !suspended ? (
                <div className="flex flex-col gap-3 rounded-card border border-border p-4" data-suspend-form>
                  <h3 className="text-h3">{t("measures.suspendTitle")}</h3>
                  <p className="text-small text-ink-muted">{t("measures.suspendIntro")}</p>
                  <AdminForm
                    id="sperren"
                    action={restrictAccountAction.bind(null, user.id, "SUSPENDED")}
                    fields={[
                      { kind: "select", name: "rule", label: t("measures.rule"), hint: t("measures.ruleHint"), options: ruleOptions },
                      { kind: "textarea", name: "reason", label: t("measures.reason"), hint: t("measures.reasonHint"), minLength: 10, maxLength: 1000, rows: 3 },
                      { kind: "date", name: "until", label: t("measures.until"), hint: t("measures.untilHint"), optional: true, min: today },
                    ]}
                    submitLabel={t("measures.suspendSubmit")}
                    submitVariant="destructive"
                    successMessage={t("measures.suspended")}
                    confirm={{ title: t("measures.confirmTitle", { name }), description: t("measures.confirmText"), confirmLabel: t("measures.confirmSubmit"), cancelLabel: tCommon("form.cancel") }}
                    resetOnSuccess
                  />
                </div>
              ) : null}
            </div>
          </WideOnly>
        </Section>
      ) : null}

      <Section id="sicherheit" title={t("detail.security")} intro={t("detail.securityIntro")}>
        {user.securityEvents.length ? (
          <ul className="flex flex-col gap-1">
            {user.securityEvents.map((event, index) => (
              <li key={`${event.type}-${index}`} className="text-small">
                {dates.dateTime(event.createdAt)} · {t(`security.${event.type}`)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-ink-muted">{t("detail.noSecurity")}</p>
        )}
      </Section>
    </>
  );
}
