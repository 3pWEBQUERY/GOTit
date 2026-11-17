import { getSessionUserId } from "@app/auth";
import { attachmentDownloadUrl } from "@app/core/messaging";
import { mediaNotFound } from "@/features/media/delivery/serve-variant";

export const dynamic = "force-dynamic";

/**
 * Bild im Chat (Entscheid 0014): nur für Beteiligte, als Weiterleitung auf eine
 * signierte URL mit 60 Sekunden Gültigkeit, ohne Cache. Sonst 404 ohne Hinweis,
 * ob es das Bild gibt.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getSessionUserId(request.headers);
  if (!userId) return mediaNotFound();
  const location = await attachmentDownloadUrl(userId, id);
  if (!location) return mediaNotFound();
  return new Response(null, {
    status: 302,
    headers: { "cache-control": "private, no-store", location },
  });
}
