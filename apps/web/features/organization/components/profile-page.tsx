import type { Locale } from "@app/core/locale";
import { UiLink } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import { loadOwnOrganization } from "../queries/membership";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";
import { ProfileForm } from "./profile-form";

/** `/studio/o/[org]/profil`: Unternehmensprofil mit Stand der Veröffentlichung und der Nachweise. */
export async function OrganizationProfilePage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const [{ context, organization, verification }, t, tStatus] =
    await Promise.all([
      loadOwnOrganization(slug),
      getTranslations({ locale, namespace: "organization.profile" }),
      getTranslations({ locale, namespace: "organization.status" }),
    ]);
  const href = createHref(locale);
  const canEdit = context.can("profile.edit");
  const published = organization.status === "PUBLISHED";
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading title={t("title")} intro={t("intro")} />
      <section
        aria-labelledby="org-stand"
        className="flex max-w-reading flex-col gap-3 rounded-card border border-border bg-surface p-4"
      >
        <h2 id="org-stand" className="text-h3">
          {t("stateTitle")}
        </h2>
        <dl className="grid gap-3 xs:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-ink-muted">{t("publication")}</dt>
            <dd
              className="text-body text-ink"
              data-organization-status={organization.status}
            >
              {tStatus(`organization.${organization.status}`)}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-ink-muted">{t("verification")}</dt>
            <dd
              className="text-body text-ink"
              data-verification-status={verification?.status ?? "NONE"}
            >
              <UiLink
                href={href({
                  pathname: "/studio/o/[org]/nachweise",
                  params: { org: slug },
                })}
                className="underline underline-offset-4"
              >
                {tStatus(`verification.${verification?.status ?? "NONE"}`)}
              </UiLink>
            </dd>
          </div>
        </dl>
        <p className="text-small text-ink-muted">
          {published ? t("publishedHint") : t("notPublishedHint")}
        </p>
        {published ? (
          <UiLink
            href={href({ pathname: "/c/[slug]", params: { slug } })}
            className="self-start text-body text-ink underline underline-offset-4"
          >
            {t("viewPublic")}
          </UiLink>
        ) : null}
      </section>
      {canEdit ? null : <PermissionNote text={t("noPermission")} />}
      <ProfileForm
        slug={slug}
        canEdit={canEdit}
        initial={{
          name: organization.name,
          description: organization.description ?? "",
          website: organization.website ?? "",
          phone: organization.phone ?? "",
          publicEmail: organization.publicEmail ?? "",
        }}
      />
    </div>
  );
}
