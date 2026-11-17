import type { Locale } from "@app/core/locale";
import {
  listLocations,
  listOrganizationProviders,
} from "@app/core/organization";
import { EmptyState } from "@app/ui";
import { UsersRound } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createHref } from "../../shell/nav/href";
import { requireOrganization } from "../queries/membership";
import { InviteDialog } from "./invite-dialog";
import { PageHeading } from "./page-heading";
import { PermissionNote } from "./permission-note";
import { ProvidersTable, type ProviderRow } from "./providers-table";

/**
 * `/studio/o/[org]/anbieter` (v2 12.2, v1 FR-BUSINESS-003/005): Tabelle der
 * verknüpften und eingeladenen Anbieter mit «Einladen». Kein Zugang zu
 * Nachrichten, Ausweisdaten oder privaten Kalendern; der Kern liest sie nicht.
 */
export async function ProvidersPage({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const context = await requireOrganization(slug);
  const [t, format, providers, locations] = await Promise.all([
    getTranslations({ locale, namespace: "organization.providers" }),
    getFormatter({ locale }),
    listOrganizationProviders(context.userId, slug, locale),
    listLocations(context.userId, slug),
  ]);
  if (!providers || !locations) notFound();
  const href = createHref(locale);
  const canInvite = context.can("providers.invite");
  const rows: ProviderRow[] = providers.map((row) => ({
    linkId: row.linkId,
    status: row.status,
    displayName: row.displayName,
    profileHref: href({ pathname: "/p/[name]", params: { name: row.slug } }),
    regionName: row.regionName,
    locationName: row.locationName,
    invitedIso: row.invitedAt.toISOString(),
    invitedLabel: format.dateTime(row.invitedAt, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  }));
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeading
        title={t("title")}
        intro={t("intro")}
        action={
          canInvite ? (
            <InviteDialog
              slug={slug}
              locations={locations.map(({ id, name }) => ({ id, name }))}
            />
          ) : undefined
        }
      />
      <p className="max-w-reading text-small text-ink-muted">{t("privacy")}</p>
      {canInvite ? null : <PermissionNote text={t("noPermission")} />}
      <ProvidersTable
        rows={rows}
        canEnd={context.can("providers.end")}
        empty={
          <EmptyState
            icon={<UsersRound strokeWidth={1.5} />}
            title={t("emptyTitle")}
            description={canInvite ? t("emptyDescription") : t("emptyReadOnly")}
          />
        }
      />
    </div>
  );
}
