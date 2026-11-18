/**
 * Feste IDs und Adressen der Demo-Daten (Entscheid 0023). Alle Konten beginnen
 * mit `demo_`, alle Slugs mit `demo-`; so findet `--reset` alles wieder, und ein
 * zweiter Lauf aktualisiert statt zu verdoppeln.
 */
export const USER_PREFIX = "demo_";
export const SLUG_PREFIX = "demo-";
export const EMAIL_DOMAIN = "demo.invalid";

export const providerUserId = (key: string) => `demo_provider_${key}`;
export const memberUserId = (key: string) => `demo_member_${key}`;
export const organizationUserId = (key: string) => `demo_org_${key}`;

/** Die Logins mit fester Adresse; alle anderen Konten bekommen eine nummerierte Adresse. */
export const LOGIN_EMAILS = {
  member: `demo-mitglied@${EMAIL_DOMAIN}`,
  provider: `demo-anbieter@${EMAIL_DOMAIN}`,
  club: `demo-club@${EMAIL_DOMAIN}`,
} as const;

export const memberEmail = (key: string) => `demo-${key}@${EMAIL_DOMAIN}`;
export const providerEmail = (key: string) => `demo-anbieter-${key}@${EMAIL_DOMAIN}`;
export const organizationEmail = (key: string) => `demo-${key}@${EMAIL_DOMAIN}`;

export const profileId = (key: string) => `demo_profile_${key}`;
export const profileSlug = (key: string) => `demo-${key}`;
export const organizationId = (key: string) => `demo_orgn_${key}`;
export const locationId = (organization: string, key: string) => `demo_loc_${organization}_${key}`;
export const mediaId = (owner: string, index: number) => `demo_media_${owner}_${index}`;
export const conversationId = (provider: string, member: string) => `demo_conv_${provider}_${member}`;
