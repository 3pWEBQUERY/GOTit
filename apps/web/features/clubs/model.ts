import { mediaUrl } from "@app/core/media/variants";
import type { PublicOrganization } from "@app/core/organization";
import type { ViewMedia } from "../profile/model";

export type ClubLocation = PublicOrganization["locations"][number];
export type ClubProvider = PublicOrganization["providers"][number];

/** Ab so vielen verknüpften Anbietern zeigt die Übersicht eine Auswahl und verweist auf `/c/[slug]/team`. */
export const OVERVIEW_PROVIDERS = 8;

/** Galerie der Organisation: Titelbild zuerst, ohne Logo (das steht im Kopf). */
export function galleryMedia(organization: PublicOrganization): ViewMedia[] {
  return organization.media
    .filter((media) => !media.isLogo)
    .sort((a, b) => Number(b.isCover) - Number(a.isCover))
    .map((media) => ({
      key: media.id,
      alt: media.altText,
      src: mediaUrl(media.id, 960, "webp"),
      placeholderColor: media.dominantColor,
      locked: false,
    }));
}

export function logoOf(organization: PublicOrganization) {
  const logo = organization.media.find((media) => media.isLogo);
  return logo
    ? { src: mediaUrl(logo.id, 320, "webp"), alt: logo.altText }
    : null;
}

/** Ort eines Standorts so allgemein, wie die Organisation ihn angibt («Zürich · Kreis 4»). */
export function locationPlace(location: ClubLocation): string {
  return [location.regionName, location.areaLabel].filter(Boolean).join(" · ");
}

/** Anbieter, die an diesem Standort verknüpft sind. */
export function providersAt(
  organization: PublicOrganization,
  locationId: string,
): ClubProvider[] {
  return organization.providers.filter((provider) =>
    provider.locationIds.includes(locationId),
  );
}
