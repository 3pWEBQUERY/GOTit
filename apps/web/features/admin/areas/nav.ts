import { permissionsOf } from "@app/core/admin";
import { canModerate, canReview, getAdminContext } from "../access";

/**
 * Welche Bereiche die Seitenleiste zeigt: nur die, für die die Person ein
 * Recht hat (Entscheid 0022). Bereiche ohne Eintrag bleiben sichtbar.
 */
export async function adminNavVisibility(): Promise<Record<string, boolean>> {
  const { actor } = await getAdminContext();
  const permissions = new Set(permissionsOf(actor));
  const reviewer = canReview(actor);
  const moderator = canModerate(actor);
  return {
    overview: true,
    users: permissions.has("users.view"),
    providers: permissions.has("providers.view"),
    organizations: moderator,
    verifications: reviewer,
    media: reviewer,
    moderation: moderator,
    reviews: moderator,
    regions: permissions.has("regions.manage"),
    categories: permissions.has("categories.manage"),
    content: permissions.has("content.manage"),
    seo: permissions.has("content.manage"),
    support: permissions.has("support.handle"),
    system: ["flags.manage", "roles.manage", "audit.view", "system.status"].some((key) => permissions.has(key as never)),
  };
}
