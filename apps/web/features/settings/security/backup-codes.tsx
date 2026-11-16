"use client";

import { Button } from "@app/ui";
import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SaveStatus } from "../components/save-status";

/** Ersatzcodes nach dem Einrichten: einmal gezeigt, zum Herunterladen und Kopieren angeboten. */
export function BackupCodes({ codes, onFinished }: { codes: readonly string[]; onFinished: () => void }) {
  const t = useTranslations("settings.security.twoFactor");
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  function download() {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t("backupFileName");
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-h3">{t("backupTitle")}</h3>
      <p className="max-w-prose text-small text-ink-muted">{t("backupIntro")}</p>
      <ul aria-label={t("backupListLabel")} className="grid grid-cols-1 gap-2 rounded-control border border-border bg-surface-2 p-4 xs:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="tabular text-body">
            <code>{code}</code>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button icon={<Download strokeWidth={1.5} />} onClick={download}>
          {t("download")}
        </Button>
        <Button icon={<Copy strokeWidth={1.5} />} onClick={() => void copy()}>
          {t("copy")}
        </Button>
      </div>
      <SaveStatus status={copied ? "saved" : "idle"} label={t("copied")} />
      <Button variant="primary" className="self-start" onClick={onFinished}>
        {t("finish")}
      </Button>
    </div>
  );
}
