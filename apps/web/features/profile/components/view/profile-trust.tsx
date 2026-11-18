import { TrustSignals, type TrustSignal } from "@app/ui";
import { useFormatter, useTranslations } from "next-intl";
import type { ProfileViewModel } from "../../model";

const DATE = { day: "2-digit", month: "2-digit", year: "numeric" } as const;

/**
 * Vertrauenssignale getrennt untereinander, jedes mit Erklärung: was geprüft
 * wurde, wann, und was es nicht aussagt (PRD v2 10.1, v1 FR-VERIFY-004). Kein
 * Sammelabzeichen, kein Tarif-Kennzeichen.
 */
export function ProfileTrust({ model, now }: { model: ProfileViewModel; now: string }) {
  const t = useTranslations("profile.trust");
  const format = useFormatter();
  const signals: TrustSignal[] = [];
  if (model.identityCheckedAt) {
    signals.push({
      key: "identity",
      label: t("identity.label"),
      infoLabel: t("identity.info"),
      explanation: { checked: t("identity.checked"), checkedAt: format.dateTime(new Date(model.identityCheckedAt), DATE), notImplied: t("identity.notImplied") },
    });
  }
  if (model.photosChecked) {
    signals.push({
      key: "photos",
      label: t("photos.label"),
      infoLabel: t("photos.info"),
      explanation: { checked: t("photos.checked"), checkedAt: t("photos.checkedAt"), notImplied: t("photos.notImplied") },
    });
  }
  const updated = model.contentUpdatedAt ? new Date(model.contentUpdatedAt) : null;

  if (signals.length === 0 && !updated) return <p className="text-small text-ink-muted">{t("none")}</p>;
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3">
      <TrustSignals
        label={t("label")}
        signals={signals}
        explanationLabels={{ checked: t("explanation.checked"), checkedAt: t("explanation.checkedAt"), notImplied: t("explanation.notImplied") }}
        closeLabel={t("close")}
        updated={
          updated
            ? { label: t("updated", { relative: format.relativeTime(updated, new Date(now)) }), exact: format.dateTime(updated, DATE), dateTime: updated.toISOString() }
            : undefined
        }
      />
    </div>
  );
}
