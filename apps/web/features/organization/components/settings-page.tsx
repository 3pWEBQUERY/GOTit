import type { Locale } from "@app/core/locale";
import { ORGANIZATION_PERMISSIONS } from "@app/core/organization";
import { UiLink } from "@app/ui";
import { Check, Minus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { createHref } from "../../shell/nav/href";
import { loadOwnOrganization } from "../queries/membership";
import { PageHeading } from "./page-heading";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex max-w-reading flex-col gap-3 border-t border-border pt-5"
    >
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * `/studio/o/[org]/einstellungen` (v2 7.7: Organisation, Kontakt,
 * Benachrichtigungen). In Phase 1 ehrlich: Art und Adresse der Organisation,
 * die eigene Rolle mit ihren Rechten, Kontaktangaben aus dem Profil.
 * Benachrichtigungen kommen mit dem Modul Benachrichtigungen.
 */
export async function OrganizationSettingsPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const [{ context, organization }, t, tPermission] = await Promise.all([
    loadOwnOrganization(slug),
    getTranslations({ locale, namespace: "organization.settings" }),
    getTranslations({ locale, namespace: "organization.permissions" }),
  ]);
  const href = createHref(locale);
  const profileHref = href({
    pathname: "/studio/o/[org]/profil",
    params: { org: slug },
  });
  const contact = [
    organization.publicEmail,
    organization.phone,
    organization.website,
  ].filter(Boolean);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading title={t("title")} intro={t("intro")} />
      <Section id="einstellungen-organisation" title={t("organizationTitle")}>
        <dl className="grid gap-4 xs:grid-cols-2">
          <Fact label={t("kind")}>{t(`kinds.${organization.kind}`)}</Fact>
          <Fact label={t("address")}>
            <span className="tabular">/c/{organization.slug}</span>
          </Fact>
          <Fact label={t("role")}>
            <span data-organization-role={context.role}>
              {tPermission(`roles.${context.role}`)}
            </span>
          </Fact>
        </dl>
        <p className="text-small text-ink-muted">{t("kindHint")}</p>
        <h3 className="text-h3">{t("rightsTitle")}</h3>
        <ul
          aria-label={t("rightsTitle")}
          className="flex flex-col gap-1"
          data-role-rights
        >
          {ORGANIZATION_PERMISSIONS.map((permission) => {
            const allowed = context.can(permission);
            return (
              <li
                key={permission}
                className="flex items-center gap-2 text-body text-ink"
              >
                {allowed ? (
                  <Check
                    aria-hidden
                    strokeWidth={1.5}
                    className="size-4 text-success"
                  />
                ) : (
                  <Minus
                    aria-hidden
                    strokeWidth={1.5}
                    className="size-4 text-ink-muted"
                  />
                )}
                <span>
                  {tPermission(`names.${permission}`)}
                  <span className="sr-only">
                    : {allowed ? t("allowed") : t("notAllowed")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-small text-ink-muted">{t("teamLater")}</p>
      </Section>
      <Section id="einstellungen-kontakt" title={t("contactTitle")}>
        <p className="text-body text-ink">
          {contact.length > 0
            ? t("contactSet", { values: contact.join(" · ") })
            : t("contactEmpty")}
        </p>
        <p className="text-small text-ink-muted">{t("contactHint")}</p>
        <UiLink
          href={profileHref}
          className="self-start text-body text-ink underline underline-offset-4"
        >
          {t("contactEdit")}
        </UiLink>
      </Section>
      <Section
        id="einstellungen-benachrichtigungen"
        title={t("notificationsTitle")}
      >
        <p className="text-body text-ink">{t("notificationsLater")}</p>
      </Section>
    </div>
  );
}
