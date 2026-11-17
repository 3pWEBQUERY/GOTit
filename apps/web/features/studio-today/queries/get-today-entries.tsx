import type { ViewerProvider } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { getLatestIdentityCheck } from "@app/core/verification";
import { UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { EXPIRY_WARNING_DAYS, identityView } from "../../verification/identity-view";
import type { TodoEntry } from "../components/todo-list";

/**
 * Einträge von «Zu erledigen», nach Dringlichkeit (PRD 11.1): zuerst die
 * Verifizierung, dann der Prüfstatus des Profils. Bis Schritt 1.12 nicht mehr.
 */
export async function getTodayEntries(locale: Locale, userId: string, provider: ViewerProvider | null): Promise<TodoEntry[]> {
  if (!provider) return [];
  const [t, check] = await Promise.all([getTranslations({ locale, namespace: "studio.today" }), getLatestIdentityCheck(userId)]);
  const view = identityView(check);
  const link = (href: string, label: string) => (
    <UiLink href={href} className={buttonVariants({ variant: "secondary" })}>
      {label}
    </UiLink>
  );
  const verificationHref = getPathname({
    href: "/studio/verifizierung",
    locale,
  });
  const entries: TodoEntry[] = [];
  const published = provider.status === "PUBLISHED" || provider.status === "PAUSED" || provider.status === "SUBMITTED";

  if (view.kind === "valid" && view.expiresInDays <= EXPIRY_WARNING_DAYS) {
    entries.push({
      id: "verification",
      text: t("verificationExpires", { days: view.expiresInDays }),
      action: link(verificationHref, t("renew")),
    });
  } else if (view.kind === "expired" && published) {
    entries.push({
      id: "verification",
      text: t("verificationExpired"),
      action: link(verificationHref, t("renew")),
    });
  }
  if (provider.status === "SUBMITTED")
    entries.push({
      id: "status",
      text: t("inReview"),
      hint: t("inReviewHint"),
    });
  if (provider.status === "CHANGES_REQUESTED") {
    entries.push({
      id: "status",
      text: t("changesRequested"),
      action: link(getPathname({ href: "/studio/start", locale }), t("reviewCorrections")),
    });
  }
  if (provider.status === "SUSPENDED") entries.push({ id: "status", text: t("suspended") });
  return entries;
}
