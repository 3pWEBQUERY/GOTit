import type { ClubProvider } from "../model";
import { ClubProviderCard } from "./club-provider-card";

/** Verknüpfte Anbieter als ProfileCard-Raster (v2 9.3, 9.4), wie die Reihen von Entdecken. */
export function ClubProviderGrid({
  providers,
  profileHref,
  hearted,
  signInHref,
  headingLevel,
  label,
}: {
  providers: readonly ClubProvider[];
  profileHref: (slug: string) => string;
  hearted: ReadonlySet<string>;
  signInHref: string | null;
  headingLevel: 2 | 3 | 4;
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      data-club-providers
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
    >
      {providers.map((provider) => (
        <li key={provider.slug}>
          <ClubProviderCard
            provider={provider}
            href={profileHref(provider.slug)}
            favorite={hearted.has(provider.slug)}
            signInHref={signInHref}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  );
}
