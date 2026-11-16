"use client";

import { ProfileCard, ProfileCardSkeleton } from "@app/ui";
import { useState } from "react";
import { ProfileContactDemo } from "./profile-contact-demo";
import { ProfileContentDemo } from "./profile-content-demo";
import { ProfileMediaDemo } from "./profile-media-demo";
import { ProfileTrustDemo } from "./profile-trust-demo";

const cardSignals = [
  { key: "identity", label: "Identität geprüft" },
  { key: "photos", label: "Fotos geprüft" },
  { key: "phone", label: "Telefon geprüft" },
];

/** Testseite der Gruppe «Profil»: jede Komponente in allen Zuständen. Bilder sind neutrale Flächen. */
export function ProfileSection() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ zwei: true });

  function favorite(key: string, name: string) {
    const pressed = favorites[key] === true;
    return {
      label: pressed ? `${name} aus den Favoriten entfernen` : `${name} als Favorit speichern`,
      pressed,
      onPressedChange: (next: boolean) => setFavorites((current) => ({ ...current, [key]: next })),
    };
  }

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">ProfileCard</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Rasteransicht</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ProfileCard
              href="#profil-eins"
              name="Beispielname Eins"
              headingLevel={4}
              region="Beispielstadt · Beispielquartier"
              signals={cardSignals}
              availability="Heute verfügbar"
              favorite={favorite("eins", "Beispielname Eins")}
            />
            <ProfileCard
              href="#profil-zwei"
              name="Beispielname Zwei"
              headingLevel={4}
              region="Musterstadt"
              sponsoredLabel="Anzeige"
              signals={cardSignals.slice(0, 1)}
              favorite={favorite("zwei", "Beispielname Zwei")}
            />
            <ProfileCard href="#profil-drei" name="Beispielname mit einem sehr langen Namen" headingLevel={4} region="Beispielregion" favorite={favorite("drei", "Beispielname Drei")} />
            <ProfileCard href="#profil-vier" name="Beispielname Vier" headingLevel={4} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Listenansicht</h3>
          <div className="flex max-w-reading flex-col gap-6">
            <ProfileCard
              variant="list"
              href="#profil-eins"
              name="Beispielname Eins"
              headingLevel={4}
              region="Beispielstadt · Beispielquartier"
              signals={cardSignals}
              languages="Spricht Deutsch, Englisch, Französisch"
              priceFrom="Preis ab CHF 000"
              nextAvailability="Nächster Termin heute, 14–22 Uhr"
              favorite={favorite("eins", "Beispielname Eins")}
            />
            <ProfileCard
              variant="list"
              href="#profil-zwei"
              name="Beispielname Zwei"
              headingLevel={4}
              region="Musterstadt"
              sponsoredLabel="Anzeige"
              languages="Spricht Deutsch"
              favorite={favorite("zwei", "Beispielname Zwei")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Kompakt</h3>
          <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
            <ProfileCard variant="compact" href="#profil-eins" name="Beispielname Eins" headingLevel={4} region="Beispielstadt" />
            <ProfileCard variant="compact" href="#profil-zwei" name="Beispielname Zwei" headingLevel={4} region="Musterstadt" sponsoredLabel="Anzeige" />
            <ProfileCard variant="compact" href="#profil-drei" name="Beispielname Drei" headingLevel={4} region="Beispielregion" favorite={favorite("drei", "Beispielname Drei")} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Lädt</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton variant="compact" />
          </div>
          <div className="max-w-reading">
            <ProfileCardSkeleton variant="list" />
          </div>
        </div>
      </section>

      <ProfileTrustDemo />
      <ProfileMediaDemo />
      <ProfileContentDemo />
      <ProfileContactDemo />
    </div>
  );
}
