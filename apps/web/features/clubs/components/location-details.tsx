import type { PublicOrganization } from "@app/core/organization";
import { useTranslations } from "next-intl";
import type { ClubLocation } from "../model";
import { ContactLinks } from "./club-header";
import { TodayLine, UpcomingExceptions, WeeklyHours } from "./opening-hours";

/** Öffnungszeiten mit Stand für heute, Beschreibung und Kontakt eines Standorts; fehlt die Angabe am Standort, gilt die der Organisation. */
export function LocationDetails({
  organization,
  location,
}: {
  organization: PublicOrganization;
  location: ClubLocation;
}) {
  const t = useTranslations("clubs");
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section
        aria-labelledby="standort-zeiten"
        className="flex flex-col gap-3"
      >
        <h2 id="standort-zeiten" className="text-h2">
          {t("hours.title")}
        </h2>
        <TodayLine
          hours={location.hours}
          exceptions={location.exceptions}
          now={new Date()}
        />
        <WeeklyHours
          hours={location.hours}
          caption={t("locations.hoursOf", { name: location.name })}
        />
        <p className="text-small text-ink-muted">{t("hours.timeZone")}</p>
        <UpcomingExceptions
          exceptions={location.exceptions}
          headingId="standort-ausnahmen"
          level={3}
        />
      </section>
      <div className="flex flex-col gap-8">
        {location.description ? (
          <section
            aria-labelledby="standort-ueber"
            className="flex flex-col gap-3"
          >
            <h2 id="standort-ueber" className="text-h2">
              {t("location.about")}
            </h2>
            <p className="max-w-prose text-body whitespace-pre-line text-ink">
              {location.description}
            </p>
          </section>
        ) : null}
        <section
          aria-labelledby="standort-kontakt"
          className="flex flex-col gap-3"
        >
          <h2 id="standort-kontakt" className="text-h2">
            {t("contact.title")}
          </h2>
          <ContactLinks
            website={location.website ?? organization.website}
            phone={location.phone ?? organization.phone}
            email={organization.publicEmail}
          />
        </section>
      </div>
    </div>
  );
}
