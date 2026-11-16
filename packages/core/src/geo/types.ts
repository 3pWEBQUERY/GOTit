export interface RegionSummary {
  slug: string;
  kind: "CANTON" | "CITY";
  name: string;
  /** Slug des Kantons, zu dem eine Stadt gehört. */
  cantonSlug: string | null;
}
