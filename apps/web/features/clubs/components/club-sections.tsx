import type { PublicOrganization } from "@app/core/organization";
import { EmptyState, UiLink, buttonVariants } from "@app/ui";
import { UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ProfileGallery } from "../../profile/components/view/profile-gallery";
import type { ViewMedia } from "../../profile/model";
import { OVERVIEW_PROVIDERS } from "../model";
import { ClubLocations, linkClass } from "./club-locations";

export function Section({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={id} className="text-h2">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Leerzustand ohne verknüpfte Anbieter: ein Satz und der Weg zur Suche (v2 13). */
export function ProvidersEmpty({ searchHref }: { searchHref: string }) {
  const t = useTranslations("clubs.providers");
  return (
    <EmptyState
      icon={<UsersRound strokeWidth={1.5} />}
      title={t("empty")}
      description={t("emptyHint")}
      action={
        <UiLink
          href={searchHref}
          className={buttonVariants({ variant: "secondary" })}
        >
          {t("toSearch")}
        </UiLink>
      }
    />
  );
}

/** Übersicht: Über uns, Standorte, verknüpfte Anbieter (Auswahl) und Galerie (v2 9.4). */
export function ClubOverview({
  organization,
  gallery,
  providers,
  teamHref,
  locationHref,
}: {
  organization: PublicOrganization;
  gallery: ViewMedia[];
  /** Das fertige Raster der ersten Anbieter oder der Leerzustand. */
  providers: ReactNode;
  teamHref: string;
  locationHref: (id: string) => string;
}) {
  const t = useTranslations("clubs");
  const count = organization.providers.length;
  return (
    <>
      <Section id="club-ueber" title={t("sections.about")}>
        <p className="max-w-prose text-body whitespace-pre-line text-ink">
          {organization.description || t("sections.noDescription")}
        </p>
      </Section>
      <Section id="club-standorte" title={t("sections.locations")}>
        <ClubLocations
          locations={organization.locations}
          now={new Date()}
          locationHref={locationHref}
        />
      </Section>
      <Section
        id="club-anbieter"
        title={t("sections.providers")}
        action={
          count > OVERVIEW_PROVIDERS ? (
            <UiLink href={teamHref} className={linkClass}>
              {t("providers.all", { count })}
            </UiLink>
          ) : undefined
        }
      >
        {providers}
      </Section>
      {gallery.length > 0 ? (
        <Section id="club-galerie" title={t("sections.gallery")}>
          <ProfileGallery
            name={organization.name}
            media={gallery}
            layout="responsive"
            variant="grid"
          />
        </Section>
      ) : null}
    </>
  );
}
