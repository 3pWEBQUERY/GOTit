"use client";

import { EventCard, FollowButton, TourCard } from "@app/ui";
import { useState } from "react";
import { CommunityDemoBlock } from "./community-demo-block";

const followLabels = { follow: "Folgen", following: "Gefolgt" };

const tours = [
  { id: "1", name: "Beispielname A", initials: "BA", regions: "Beispielstadt", period: "12.–14. Nov." },
  { id: "2", name: "Beispielname B", initials: "BB", regions: "Beispielstadt, Beispielort", period: "16.–20. Nov." },
  { id: "3", name: "Beispielname C mit langem Namen", initials: "BC", regions: "Beispielregion", period: "28. Nov. – 2. Dez." },
];

/** EventCard, TourCard und FollowButton der Testseite «Community». */
export function CommunityCardsDemo() {
  const [following, setFollowing] = useState(false);
  const [pending, setPending] = useState(false);

  const changeFollowing = (next: boolean) => {
    setPending(true);
    window.setTimeout(() => {
      setFollowing(next);
      setPending(false);
    }, 800);
  };

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">EventCard</h2>
        <CommunityDemoBlock title="Mit Uhrzeit">
          <EventCard day="21" month="Nov." dateTime="2026-11-21T19:00" dateLabel="Samstag, 21. November 2026" timeRange="19:00–23:00" title="Beispielveranstaltung" href="#beispielveranstaltung" location="Beispielort, Beispielstadt" organizer="Veranstaltet von Beispielstudio" titleAs="h4" />
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Langer Titel, ohne Uhrzeit">
          <EventCard day="5" month="Dez." dateTime="2026-12-05" dateLabel="Samstag, 5. Dezember 2026" title="Beispielveranstaltung mit einem langen Titel, der über zwei Zeilen läuft" href="#beispielveranstaltung-lang" location="Beispielregion" organizer="Veranstaltet von Beispielname" titleAs="h4" />
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Als Liste in zwei Spalten" wide>
          <ul className="grid gap-3 md:grid-cols-2">
            <li>
              <EventCard day="21" month="Nov." dateTime="2026-11-21" dateLabel="Samstag, 21. November 2026" title="Beispielveranstaltung A" href="#beispielveranstaltung-a" location="Beispielstadt" organizer="Veranstaltet von Beispielstudio" titleAs="h4" />
            </li>
            <li>
              <EventCard day="28" month="Nov." dateTime="2026-11-28" dateLabel="Samstag, 28. November 2026" title="Beispielveranstaltung B" href="#beispielveranstaltung-b" location="Beispielort" organizer="Veranstaltet von Beispielname" titleAs="h4" />
            </li>
          </ul>
        </CommunityDemoBlock>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">TourCard</h2>
        <CommunityDemoBlock title="Liste in drei Spalten" wide>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <li key={tour.id} className="min-w-0">
                <TourCard name={tour.name} href={`#beispieltour-${tour.id}`} regions={tour.regions} period={tour.period} initials={tour.initials} className="h-full" />
              </li>
            ))}
          </ul>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Horizontale Reihe" wide>
          <ul aria-label="Touren diese Woche" className="flex gap-3 overflow-x-auto py-1">
            {tours.concat(tours.map((tour) => ({ ...tour, id: `${tour.id}-b` }))).map((tour) => (
              <li key={tour.id} className="w-64 shrink-0">
                <TourCard name={tour.name} href={`#beispieltour-reihe-${tour.id}`} regions={tour.regions} period={tour.period} initials={tour.initials} className="h-full" />
              </li>
            ))}
          </ul>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Ohne Initialen-Fläche">
          <TourCard name="Beispielname" href="#beispieltour-ohne" regions="Beispielstadt" period="12.–14. Nov." />
        </CommunityDemoBlock>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">FollowButton</h2>
        <CommunityDemoBlock title="Ruhe: Folgen und Gefolgt">
          <div className="flex flex-wrap gap-3">
            <FollowButton following={false} labels={followLabels} />
            <FollowButton following labels={followLabels} />
          </div>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Umschalten mit kurzem Speichern">
          <div>
            <FollowButton following={following} pending={pending} labels={followLabels} onFollowingChange={changeFollowing} />
          </div>
          <p role="status" className="text-small text-ink-muted">
            {pending ? "Wird gespeichert" : following ? "Du folgst Beispielname." : "Du folgst Beispielname nicht."}
          </p>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Wird gespeichert und deaktiviert">
          <div className="flex flex-wrap gap-3">
            <FollowButton following={false} pending labels={followLabels} />
            <FollowButton following={false} disabled labels={followLabels} />
          </div>
        </CommunityDemoBlock>
      </section>
    </>
  );
}
