import type { OwnerView } from "@app/core/provider-profile";
import type { ProfileSection } from "@app/core/provider-profile/schemas";
import { UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { OwnerEditMenu } from "./owner-edit-menu";

/**
 * Eigentümer-Leiste (PRD v2 6.1 Punkt 3): «So sehen Besucher dein Profil» mit
 * «Bearbeiten». «Statistik ansehen» kommt mit `/studio/statistik` (Schritt 1.12,
 * Entscheid 0012). Ist das Profil nicht öffentlich, sagt die Leiste warum.
 */
export function OwnerBar({ owner, links, studioHref }: { owner: OwnerView; links: Record<ProfileSection, string>; studioHref: string }) {
  const t = useTranslations("profile.owner");
  const tStatus = useTranslations("studio.status");
  return (
    <section aria-label={t("label")} data-owner-bar className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body font-[550] text-ink">{t("title")}</p>
        <p className="text-small text-ink-muted">
          {`${tStatus("prefix")} ${tStatus(owner.status)}. `}
          {owner.reachable ? t("reachable") : t("notReachable")}
          {owner.pendingChange ? ` ${t("pendingChange")}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <OwnerEditMenu links={links} />
        <UiLink href={studioHref} className="inline-flex min-h-11 items-center px-2 text-small text-ink underline underline-offset-4 hover:text-accent">
          {t("toStudio")}
        </UiLink>
      </div>
    </section>
  );
}
