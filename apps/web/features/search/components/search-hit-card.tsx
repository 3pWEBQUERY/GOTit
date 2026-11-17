"use client";

import type { SearchHit } from "@app/core/search";
import { mediaUrl } from "@app/core/media/variants";
import { ProfileCard, type ProfileCardVariant } from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { languageName } from "../../onboarding/format";
import { useFavorite } from "../../favorites/components/use-favorite";

export interface SearchHitCardProps {
  hit: SearchHit;
  href: string;
  variant?: ProfileCardVariant;
  headingLevel?: 2 | 3 | 4;
  favorite: boolean;
  /** Für Besucher: Ziel des Herzens (Anmeldung mit Rückweg). Angemeldet: null. */
  signInHref: string | null;
}

/**
 * Ergebniskarte (PRD v2 9.3): ganze Karte als Link, Herz als eigener Button,
 * höchstens zwei Signale, keine Sterne, kein Online-Punkt. «Heute verfügbar»
 * folgt mit dem Kalender (Schritt 1.9), «Anzeige» mit der Werbung (Phase 2).
 */
export function SearchHitCard({
  hit,
  href,
  variant = "grid",
  headingLevel = 3,
  favorite,
  signInHref,
}: SearchHitCardProps) {
  const t = useTranslations("search.card");
  const locale = useLocale();
  const state = useFavorite({ slug: hit.slug, initial: favorite, signInHref });
  const region = [hit.regionName, hit.locationLabel]
    .filter(Boolean)
    .join(" · ");
  const signals = [
    { key: "identity", label: t("identityChecked") },
    ...(hit.photosChecked
      ? [{ key: "photos", label: t("photosChecked") }]
      : []),
  ];
  const languages =
    hit.languages.length > 0
      ? t("languages", {
          languages: new Intl.ListFormat(locale, {
            type: "conjunction",
          }).format(hit.languages.map((code) => languageName(locale, code))),
        })
      : undefined;
  const price =
    hit.priceFromChf === null
      ? t("priceOnRequest")
      : t("priceFrom", {
          price: new Intl.NumberFormat(
            locale === "de" ? "de-CH" : locale,
          ).format(hit.priceFromChf),
        });
  return (
    <ProfileCard
      variant={variant}
      href={href}
      name={hit.displayName}
      headingLevel={headingLevel}
      image={
        hit.cover
          ? {
              src: mediaUrl(
                hit.cover.mediaId,
                variant === "list" ? 320 : 640,
                "webp",
              ),
              alt: hit.cover.alt ?? t("coverAlt", { name: hit.displayName }),
              ...(hit.cover.color ? { placeholderColor: hit.cover.color } : {}),
            }
          : undefined
      }
      region={region || undefined}
      signals={signals}
      favorite={{
        label: state.pressed
          ? t("favoriteRemove", { name: hit.displayName })
          : t("favoriteAdd", { name: hit.displayName }),
        pressed: state.pressed,
        onPressedChange: state.toggle,
        disabled: state.pending,
      }}
      languages={variant === "list" ? languages : undefined}
      priceFrom={variant === "list" ? price : undefined}
    />
  );
}
