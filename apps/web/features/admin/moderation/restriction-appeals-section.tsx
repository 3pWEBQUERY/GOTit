import { hasPermission, type AdminActor } from "@app/core/admin";
import type { Locale } from "@app/core/locale";
import { EmptyState, InlineAlert } from "@app/ui";
import { Scale } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AppealDecisionForm } from "./appeal-decision-form";
import { getRestrictionAppeals } from "./queries";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body break-words whitespace-pre-wrap text-ink">{children}</dd>
    </div>
  );
}

/**
 * Einsprüche gegen Einschränkungen und Sperren (v1 9.2), älteste zuerst.
 * Stattgeben hebt die Einschränkung auf. Wer sie verhängt hat, entscheidet
 * nicht selbst; über eine Sperre entscheidet nur, wer sperren darf.
 */
export async function RestrictionAppealsSection({ locale, actor }: { locale: Locale; actor: AdminActor }) {
  const [t, format, appeals] = await Promise.all([getTranslations({ locale, namespace: "moderation" }), getFormatter({ locale }), getRestrictionAppeals(actor)]);
  if (appeals === null) return <InlineAlert title={t("restrictionAppeals.restricted")} />;
  const day = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric" });
  const stamp = (value: Date) => format.dateTime(value, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const canSuspend = hasPermission(actor, "users.suspend");

  return (
    <section aria-labelledby="einsprueche-sperren" className="flex flex-col gap-4">
      <h2 id="einsprueche-sperren" className="text-h2">
        {t("restrictionAppeals.title")}
      </h2>
      <p role="status" className="tabular text-small text-ink-muted">
        {t("restrictionAppeals.count", { count: appeals.length })}
      </p>
      {appeals.length === 0 ? (
        <EmptyState icon={<Scale strokeWidth={1.5} />} title={t("restrictionAppeals.empty.title")} description={t("restrictionAppeals.empty.description")} />
      ) : (
        <ol className="flex flex-col divide-y divide-border border-y border-border" aria-label={t("restrictionAppeals.listLabel")}>
          {appeals.map((appeal) => {
            const own = appeal.createdById === actor.userId && !actor.roles.includes("SUPER_ADMIN");
            const blocked = appeal.kind === "SUSPENDED" && !canSuspend;
            return (
              <li key={appeal.id} className="grid gap-6 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" data-restriction-appeal={appeal.id}>
                <div className="flex min-w-0 flex-col gap-3">
                  <h3 className="text-h3">{t("restrictionAppeals.itemTitle", { name: appeal.user.username ?? t("memberFallback"), kind: t(`restrictionKind.${appeal.kind}`) })}</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Fact label={t("restrictionAppeals.rule")}>{t.has(`rules.${appeal.rule}`) ? `${appeal.rule} ${t(`rules.${appeal.rule}`)}` : appeal.rule}</Fact>
                    <Fact label={t("restrictionAppeals.until")}>{appeal.until ? day(appeal.until) : t("restrictionAppeals.noEnd")}</Fact>
                    <Fact label={t("restrictionAppeals.appealedAt")}>{appeal.appealedAt ? stamp(appeal.appealedAt) : "–"}</Fact>
                    <Fact label={t("restrictionAppeals.reason")}>{appeal.reason}</Fact>
                  </dl>
                  <div className="flex flex-col gap-1 rounded-control bg-surface-2 p-4">
                    <p className="text-label text-ink-muted">{t("restrictionAppeals.appealText")}</p>
                    <p className="text-body break-words whitespace-pre-wrap">{appeal.appealReason ?? "–"}</p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  {own ? (
                    <InlineAlert title={t("restrictionAppeals.ownTitle")}>{t("restrictionAppeals.ownText")}</InlineAlert>
                  ) : blocked ? (
                    <InlineAlert title={t("restrictionAppeals.suspendOnlyTitle")}>{t("restrictionAppeals.suspendOnlyText")}</InlineAlert>
                  ) : (
                    <>
                      <div className="hidden lg:block">
                        <AppealDecisionForm id={appeal.id} kind="restriction" />
                      </div>
                      <div className="lg:hidden">
                        <InlineAlert title={t("readOnly.title")}>{t("readOnly.text")}</InlineAlert>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
