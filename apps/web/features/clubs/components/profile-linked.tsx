import type { Locale } from "@app/core/locale";
import { listPublicOrganizationsOfProvider } from "@app/core/organization";
import { UiLink } from "@app/ui";
import { Building2, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createHref } from "../../shell/nav/href";

/**
 * «Verknüpft mit» auf `/p/[name]` (v2 8.2, 10): veröffentlichte Clubs und
 * Agenturen mit aktiver Verknüpfung, als Link zu `/c/[slug]`. Ohne
 * Verknüpfung entfällt der Abschnitt. Nicht in der Vorschau des Studios.
 */
export async function ProfileLinkedClubs({
  locale,
  slug,
}: {
  locale: Locale;
  slug: string;
}) {
  const [t, organizations] = await Promise.all([
    getTranslations({ locale, namespace: "clubs" }),
    listPublicOrganizationsOfProvider(slug, locale),
  ]);
  if (organizations.length === 0) return null;
  const href = createHref(locale);
  return (
    <section
      aria-labelledby="profil-verknuepft"
      className="flex flex-col gap-3"
    >
      <h2 id="profil-verknuepft" className="text-h2">
        {t("profile.title")}
      </h2>
      <ul className="flex flex-col divide-y divide-border border-y border-border">
        {organizations.map((organization) => (
          <li key={organization.slug}>
            <UiLink
              href={href({
                pathname: "/c/[slug]",
                params: { slug: organization.slug },
              })}
              className="flex min-h-11 items-center gap-3 py-3 text-body text-ink hover:text-accent"
            >
              <Building2
                aria-hidden
                strokeWidth={1.5}
                className="size-5 shrink-0 text-ink-muted"
              />
              <span className="min-w-0 flex-1">
                <span className="font-[550] underline underline-offset-4">
                  {organization.name}
                </span>
                <span className="text-ink-muted">
                  {" · "}
                  {[
                    t(`kind.${organization.kind}`),
                    organization.regionNames.join(", "),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                strokeWidth={1.5}
                className="size-5 shrink-0 text-ink-muted"
              />
            </UiLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
