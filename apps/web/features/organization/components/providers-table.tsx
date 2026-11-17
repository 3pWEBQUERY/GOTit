"use client";

import type { OrganizationLinkStatus } from "@app/db";
import {
  Button,
  ConfirmDialog,
  DataTable,
  InlineAlert,
  UiLink,
  useToast,
  type DataTableColumn,
} from "@app/ui";
import { Unlink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { endLinkAction } from "../actions/links";
import { LinkStatus } from "./link-status";

export interface ProviderRow {
  linkId: string;
  status: OrganizationLinkStatus;
  displayName: string;
  profileHref: string;
  regionName: string | null;
  locationName: string | null;
  invitedIso: string;
  invitedLabel: string;
}

/**
 * Verknüpfte Anbieter (v2 12.2): Name, Region, Standort, Status als Wort und
 * Einladungsdatum, nur öffentliche Profilangaben. Unter 768 px wird jede Zeile
 * zur Karte. «Verknüpfung lösen» nach Rückfrage, nur mit «providers.end».
 */
export function ProvidersTable({
  rows,
  canEnd,
  empty,
}: {
  rows: readonly ProviderRow[];
  canEnd: boolean;
  empty: ReactNode;
}) {
  const t = useTranslations("organization.providers");
  const router = useRouter();
  const { toast } = useToast();
  const [failed, setFailed] = useState(false);
  const columns: DataTableColumn<ProviderRow>[] = [
    {
      id: "name",
      header: t("columns.name"),
      priority: 1,
      cell: (row) => (
        <UiLink
          href={row.profileHref}
          className="font-[550] break-words text-ink underline-offset-4 hover:underline"
          data-provider-link={row.linkId}
        >
          {row.displayName}
        </UiLink>
      ),
    },
    {
      id: "region",
      header: t("columns.region"),
      cell: (row) => row.regionName ?? t("none"),
    },
    {
      id: "standort",
      header: t("columns.location"),
      priority: 3,
      cell: (row) => row.locationName ?? t("none"),
    },
    {
      id: "status",
      header: t("columns.status"),
      priority: 2,
      cell: (row) => <LinkStatus status={row.status} />,
    },
    {
      id: "eingeladen",
      header: t("columns.invited"),
      cell: (row) => (
        <time dateTime={row.invitedIso} className="tabular">
          {row.invitedLabel}
        </time>
      ),
    },
  ];

  async function end(row: ProviderRow) {
    setFailed(false);
    const result = await endLinkAction(row.linkId).catch(() => ({
      ok: false as const,
    }));
    if (!result.ok) {
      setFailed(true);
      throw new Error("end-failed");
    }
    toast({ title: t("ended", { name: row.displayName }), tone: "success" });
    router.refresh();
  }

  return (
    <DataTable
      caption={t("caption")}
      captionHidden
      columns={columns}
      rows={rows}
      getRowId={(row) => row.linkId}
      empty={empty}
      rowActionsLabel={t("columns.actions")}
      rowActions={(row) =>
        canEnd && (row.status === "INVITED" || row.status === "ACTIVE") ? (
          <ConfirmDialog
            trigger={
              <Button
                variant="quiet"
                icon={<Unlink aria-hidden strokeWidth={1.5} />}
                data-end-link={row.linkId}
                aria-label={`${row.status === "INVITED" ? t("withdraw") : t("end")}: ${row.displayName}`}
              >
                {row.status === "INVITED" ? t("withdraw") : t("end")}
              </Button>
            }
            title={
              row.status === "INVITED"
                ? t("withdrawTitle", { name: row.displayName })
                : t("endTitle", { name: row.displayName })
            }
            description={t("endDescription")}
            confirmLabel={
              row.status === "INVITED" ? t("withdrawConfirm") : t("endConfirm")
            }
            cancelLabel={t("cancel")}
            onConfirm={() => end(row)}
          >
            {failed ? (
              <InlineAlert tone="error" title={t("endFailed")} />
            ) : null}
          </ConfirmDialog>
        ) : null
      }
    />
  );
}
