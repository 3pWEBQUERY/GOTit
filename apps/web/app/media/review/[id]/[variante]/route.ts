import { getSessionUserId } from "@app/auth";
import { resolveReviewPreview } from "@app/core/media";
import { serveVariant } from "@/features/media/delivery/serve-variant";

export const dynamic = "force-dynamic";

/** Vorschau für die Moderation: nur Medien in Prüfung, nur mit Prüfrolle und zweitem Faktor; sonst 404. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params;
  const viewer = await getSessionUserId(request.headers);
  return serveVariant(await resolveReviewPreview(id, variante, viewer));
}
