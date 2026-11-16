import { getDb } from "@app/db";
import { isFlagOn, type FeatureKey } from "./policy";

export async function isFeatureEnabled(key: FeatureKey, regionSlug?: string | null): Promise<boolean> {
  const row = await getDb().featureFlag.findUnique({ where: { key } });
  return isFlagOn(row, regionSlug);
}
