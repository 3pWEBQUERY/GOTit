import type { Locale } from "@app/core/locale";
import {
  listLocations,
  listOrganizationProviders,
} from "@app/core/organization";
import { UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";
import {
  TodoList,
  type TodoEntry,
} from "../../studio-today/components/todo-list";
import { loadOwnOrganization } from "../queries/membership";
import { PageHeading } from "./page-heading";

/**
 * Heute für die Organisation (v2 7.7): was offen ist, nach Dringlichkeit.
 * Zuerst die Nachweise, weil die Organisation ohne sie nicht öffentlich wird,
 * dann Standorte und offene Einladungen.
 */
export async function OrganizationTodayPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const { context, organization, verification } =
    await loadOwnOrganization(slug);
  const [t, tStudio, locations, providers] = await Promise.all([
    getTranslations({ locale, namespace: "organization.today" }),
    getTranslations({ locale, namespace: "studio.today" }),
    listLocations(context.userId, slug),
    listOrganizationProviders(context.userId, slug, locale),
  ]);
  const href = createHref(locale);
  const params = { org: slug };
  const link = (target: string, label: string) => (
    <UiLink href={target} className={buttonVariants({ variant: "secondary" })}>
      {label}
    </UiLink>
  );
  const credentials = href({ pathname: "/studio/o/[org]/nachweise", params });
  const entries: TodoEntry[] = [];

  if (!verification)
    entries.push({
      id: "nachweise",
      text: t("submitCredentials"),
      hint: t("submitCredentialsHint"),
      action: context.can("verification.submit")
        ? link(credentials, t("openCredentials"))
        : undefined,
    });
  else if (verification.status === "CHANGES_REQUESTED")
    entries.push({
      id: "nachweise",
      text: t("changesRequested"),
      hint: verification.reason ?? undefined,
      action: link(credentials, t("reviewCorrections")),
    });
  else if (verification.status === "SUBMITTED")
    entries.push({
      id: "nachweise",
      text: t("inReview"),
      hint: t("inReviewHint"),
    });
  else if (verification.status === "REJECTED")
    entries.push({
      id: "nachweise",
      text: t("rejected"),
      hint: verification.reason ?? undefined,
    });

  if (locations && locations.length === 0)
    entries.push({
      id: "standorte",
      text: t("noLocation"),
      hint: t("noLocationHint"),
      action: context.can("locations.edit")
        ? link(
            href({ pathname: "/studio/o/[org]/standorte", params }),
            t("addLocation"),
          )
        : undefined,
    });

  const invited =
    providers?.filter((row) => row.status === "INVITED").length ?? 0;
  if (invited > 0)
    entries.push({
      id: "einladungen",
      text: t("openInvitations", { count: invited }),
      hint: t("openInvitationsHint"),
      action: link(
        href({ pathname: "/studio/o/[org]/anbieter", params }),
        t("viewProviders"),
      ),
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={tStudio("organizationTitle", { name: organization.name })}
        intro={
          organization.status === "PUBLISHED"
            ? t("published")
            : t("notPublished")
        }
      />
      <TodoList
        heading={tStudio("todo")}
        entries={entries}
        emptyText={tStudio("nothingOpen")}
      />
    </div>
  );
}
