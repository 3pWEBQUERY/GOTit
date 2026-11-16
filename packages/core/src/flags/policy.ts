/** `community` = Phase 3, `business-suite` = Phase 2 (Werbung, Abrechnung, Team, Detailstatistik). */
export const FEATURE_KEYS = ["community", "business-suite"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FlagState {
  enabled: boolean;
  disabledRegions: readonly string[];
}

/** Ein fehlendes Flag gilt als aus. Eine Region kann ein eingeschaltetes Flag abschalten (PRD 12.3). */
export function isFlagOn(state: FlagState | null, regionSlug?: string | null): boolean {
  if (!state?.enabled) return false;
  return regionSlug ? !state.disabledRegions.includes(regionSlug) : true;
}
