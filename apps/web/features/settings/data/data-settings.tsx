"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { endAccount } from "../../account/actions/end-account";
import { SettingsBlock } from "../components/settings-block";

export interface DataSettingsProps {
  /** Fertig formatiertes Datum, an dem der `cron`-Dienst nach einem Antrag von heute löscht. */
  deletionDate: string;
  homeHref: string;
}

function fileName(response: Response): string {
  const match = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "");
  return match?.[1] ?? "konto-export.json";
}

/** Export, Deaktivieren und Löschantrag (PRD 7.5). Beides Letztere beendet sofort alle Sitzungen. */
export function DataSettings({ deletionDate, homeHref }: DataSettingsProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/konto/export", { credentials: "same-origin" });
      if (response.status === 429) return setExportError(t("data.exportRateLimited"));
      if (!response.ok) return setExportError(t(response.status === 401 ? "errors.signInRequired" : "errors.generic"));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName(response);
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: t("data.exported"), tone: "success" });
      router.refresh();
    } catch {
      setExportError(t("errors.generic"));
    } finally {
      setExporting(false);
    }
  }

  async function end(mode: "deactivate" | "delete") {
    setEndError(null);
    let ok = false;
    try {
      ok = (await endAccount({ mode })).ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      setEndError(t("errors.generic"));
      throw new Error("end-account-failed");
    }
    // Die Sitzungen sind beendet; das Abmelden räumt nur noch das Cookie dieses Browsers weg.
    await fetch("/api/auth/sign-out", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => undefined);
    toast({ title: t(mode === "deactivate" ? "data.deactivated" : "data.deleted"), tone: "success", durationMs: 12_000 });
    router.replace(homeHref);
  }

  function confirm(mode: "deactivate" | "delete", title: string, description: ReactNode, label: string) {
    return (
      <ConfirmDialog
        trigger={<Button variant="destructive">{label}</Button>}
        title={title}
        description={description}
        confirmLabel={label}
        cancelLabel={t("data.cancel")}
        onConfirm={() => end(mode)}
      >
        {endError ? <InlineAlert tone="error" title={endError} /> : null}
      </ConfirmDialog>
    );
  }

  return (
    <>
      <SettingsBlock id="export" title={t("data.exportTitle")} intro={t("data.exportText")}>
        {exportError ? <InlineAlert tone="error" title={exportError} /> : null}
        <Button icon={<Download strokeWidth={1.5} />} loading={exporting} className="self-start" onClick={() => void exportData()}>
          {t("data.export")}
        </Button>
      </SettingsBlock>
      <SettingsBlock id="deaktivieren" title={t("data.deactivateTitle")} intro={t("data.deactivateText")}>
        <div>{confirm("deactivate", t("data.deactivateConfirmTitle"), t("data.deactivateConfirmText"), t("data.deactivate"))}</div>
      </SettingsBlock>
      <SettingsBlock id="loeschen" title={t("data.deleteTitle")} intro={t("data.deleteText")}>
        <div>{confirm("delete", t("data.deleteConfirmTitle"), t("data.deleteConfirmText", { date: deletionDate }), t("data.delete"))}</div>
      </SettingsBlock>
    </>
  );
}
