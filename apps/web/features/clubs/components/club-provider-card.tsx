"use client";

import { mediaUrl } from "@app/core/media/variants";
import { ProfileCard } from "@app/ui";
import { useTranslations } from "next-intl";
import { useFavorite } from "../../favorites/components/use-favorite";
import type { ClubProvider } from "../model";

/**
 * Verknüpfter Anbieter als ProfileCard (v2 9.3, 9.4): ganze Karte als Link,
 * Herz als eigener Button, höchstens zwei Signale. Nur Angaben aus dem
 * öffentlichen Suchindex.
 */
export function ClubProviderCard({
  provider,
  href,
  favorite,
  signInHref,
  headingLevel,
}: {
  provider: ClubProvider;
  href: string;
  favorite: boolean;
  signInHref: string | null;
  headingLevel: 2 | 3 | 4;
}) {
  const t = useTranslations("search.card");
  const state = useFavorite({
    slug: provider.slug,
    initial: favorite,
    signInHref,
  });
  const region = [provider.regionName, provider.locationLabel]
    .filter(Boolean)
    .join(" · ");
  return (
    <ProfileCard
      href={href}
      name={provider.displayName}
      headingLevel={headingLevel}
      image={
        provider.coverMediaId
          ? {
              src: mediaUrl(provider.coverMediaId, 640, "webp"),
              alt:
                provider.coverAlt ??
                t("coverAlt", { name: provider.displayName }),
              ...(provider.coverColor
                ? { placeholderColor: provider.coverColor }
                : {}),
            }
          : undefined
      }
      region={region || undefined}
      signals={[
        { key: "identity", label: t("identityChecked") },
        ...(provider.photosChecked
          ? [{ key: "photos", label: t("photosChecked") }]
          : []),
      ]}
      favorite={{
        label: state.pressed
          ? t("favoriteRemove", { name: provider.displayName })
          : t("favoriteAdd", { name: provider.displayName }),
        pressed: state.pressed,
        onPressedChange: state.toggle,
        disabled: state.pending,
      }}
    />
  );
}
