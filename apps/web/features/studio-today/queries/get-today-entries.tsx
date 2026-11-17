import { listRequests } from "@app/core/booking";
import type { ViewerProvider } from "@app/core/identity";
import type { Locale } from "@app/core/locale";
import { listOwnMedia } from "@app/core/media";
import { countUnreadConversations } from "@app/core/messaging";
import type { OwnProfileEditor } from "@app/core/provider-profile";
import { getLatestIdentityCheck } from "@app/core/verification";
import { UiLink, buttonVariants } from "@app/ui";
import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { formatMoment } from "../../booking/studio/lib/format";
import {
  EXPIRY_WARNING_DAYS,
  identityView,
} from "../../verification/identity-view";
import type { TodoEntry } from "../components/todo-list";

/** So viele offene Anfragen stehen einzeln unter dem Eintrag; alle weiteren unter «Anfragen ansehen». */
const REQUESTS_SHOWN = 3;

/**
 * Einträge von «Zu erledigen», nach Dringlichkeit (PRD v2 11.1): zuerst
 * Sicherheit und Verifizierung, dann ablaufende Terminanfragen, ungelesene
 * Nachrichten und zuletzt Korrekturen (Profil, Änderungen, Fotos). Ganz unten
 * steht, was nur zur Kenntnis ist (Prüfung läuft).
 */
export async function getTodayEntries(
  locale: Locale,
  userId: string,
  provider: ViewerProvider | null,
  editor: OwnProfileEditor | null,
  now = new Date(),
): Promise<TodoEntry[]> {
  if (!provider) return [];
  const [t, check, requests, unread, library] = await Promise.all([
    getTranslations({ locale, namespace: "studio.today" }),
    getLatestIdentityCheck(userId),
    listRequests(userId, "PROVIDER", "offen", now),
    countUnreadConversations(userId, "PROVIDER"),
    listOwnMedia(userId),
  ]);
  const view = identityView(check, now);
  const link = (href: string, label: string) => (
    <UiLink href={href} className={buttonVariants({ variant: "secondary" })}>
      {label}
    </UiLink>
  );
  const path = (href: Parameters<typeof getPathname>[0]["href"]) =>
    getPathname({ href, locale });
  const verificationHref = path("/studio/verifizierung");
  const entries: TodoEntry[] = [];
  const published =
    provider.status === "PUBLISHED" ||
    provider.status === "PAUSED" ||
    provider.status === "SUBMITTED";

  // 1. Sicherheit und Verifizierung.
  if (provider.status === "SUSPENDED")
    entries.push({ id: "status", text: t("suspended") });
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

  // 2. Terminanfragen, die zuerst ablaufen, zuoberst.
  if (requests.length > 0) {
    const byExpiry = [...requests].sort(
      (a, b) => a.expiresAt.getTime() - b.expiresAt.getTime(),
    );
    const first = byExpiry[0];
    entries.push({
      id: "requests",
      text: t("requests", { count: requests.length }),
      hint: first
        ? t("requestsHint", {
            when: formatMoment(first.expiresAt, locale, first.timeZone),
          })
        : undefined,
      action: link(path("/studio/anfragen"), t("openRequests")),
      items: byExpiry.slice(0, REQUESTS_SHOWN).map((request) => ({
        id: request.id,
        content: (
          <UiLink
            href={path({
              pathname: "/studio/anfragen/[id]",
              params: { id: request.id },
            })}
            className="inline-flex min-h-11 items-center text-ink underline underline-offset-4 hover:text-accent md:min-h-0"
          >
            {t("requestFor", {
              when: formatMoment(request.startsAt, locale, request.timeZone),
            })}
          </UiLink>
        ),
      })),
    });
  }

  // 3. Nachrichten.
  if (unread > 0)
    entries.push({
      id: "messages",
      text: t("unread", { count: unread }),
      action: link(path("/studio/nachrichten"), t("openMessages")),
    });

  // 4. Korrekturen.
  if (provider.status === "CHANGES_REQUESTED")
    entries.push({
      id: "status",
      text: t("changesRequested"),
      action: link(path("/studio/start"), t("reviewCorrections")),
    });
  if (editor?.rejectedChange)
    entries.push({
      id: "change",
      text: t("changeRejected"),
      hint: editor.rejectedChange.reason ?? undefined,
      action: link(path("/studio/profil"), t("editProfile")),
    });
  const corrections =
    library?.media.filter((media) => media.status === "CHANGES_REQUESTED")
      .length ?? 0;
  if (corrections > 0)
    entries.push({
      id: "media",
      text: t("mediaCorrections", { count: corrections }),
      action: link(path("/studio/medien"), t("openMedia")),
    });

  // Zur Kenntnis: Prüfungen, bei denen nichts zu tun ist.
  if (provider.status === "SUBMITTED")
    entries.push({
      id: "status",
      text: t("inReview"),
      hint: t("inReviewHint"),
    });
  if (editor?.pendingSince)
    entries.push({
      id: "change",
      text: t("changePending"),
      hint: t("changePendingHint"),
    });
  return entries;
}
