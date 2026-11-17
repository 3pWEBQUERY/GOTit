import { getSessionUserId } from "@app/auth";
import { resolveReportPreview } from "@app/core/media";
import { serveVariant } from "@/features/media/delivery/serve-variant";

export const dynamic = "force-dynamic";

/** Vorschau eines gemeldeten Mediums: `[id]` ist der Fall, nicht das Medium. Nur mit Zugang zum Fall; sonst 404. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params;
  const viewer = await getSessionUserId(request.headers);
  return serveVariant(await resolveReportPreview(id, variante, viewer));
}
