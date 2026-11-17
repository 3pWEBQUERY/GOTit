import { UiLink } from "@app/ui";
import { useTranslations } from "next-intl";
import { locationPlace, type ClubLocation } from "../model";
import { TodayLine, UpcomingExceptions, WeeklyHours } from "./opening-hours";

export const linkClass =
  "inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent";

/**
 * Standorte mit Öffnungszeiten (v2 9.4): Ort so allgemein wie angegeben, der
 * Stand für heute, die Wochenzeiten, die nächsten abweichenden Tage und der
 * Weg zur Seite des Standorts. Nie eine Adresse (v2 16.1).
 */
export function ClubLocations({
  locations,
  now,
  locationHref,
}: {
  locations: readonly ClubLocation[];
  now: Date;
  locationHref: (id: string) => string;
}) {
  const t = useTranslations("clubs.locations");
  if (locations.length === 0)
    return <p className="text-body text-ink-muted">{t("empty")}</p>;
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {locations.map((location, index) => {
        const id = `standort-${index}`;
        const place = locationPlace(location);
        return (
          <li key={location.id} data-location={location.id}>
            <article
              aria-labelledby={id}
              className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-4"
            >
              <div className="flex flex-col gap-1">
                <h3 id={id} className="text-h3 break-words">
                  {location.name}
                </h3>
                {place ? (
                  <p className="text-small text-ink-muted">{place}</p>
                ) : null}
              </div>
              <TodayLine
                hours={location.hours}
                exceptions={location.exceptions}
                now={now}
              />
              <WeeklyHours
                hours={location.hours}
                caption={t("hoursOf", { name: location.name })}
              />
              <UpcomingExceptions
                exceptions={location.exceptions}
                limit={3}
                headingId={`${id}-ausnahmen`}
                level={4}
              />
              <UiLink
                href={locationHref(location.id)}
                className={`${linkClass} mt-auto`}
              >
                {t("open", { name: location.name })}
              </UiLink>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
