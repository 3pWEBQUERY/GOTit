import { getSessionUserId } from "@app/auth";
import { resolveMediaDelivery } from "@app/core/media";
import { serveVariant } from "@/features/media/delivery/serve-variant";

export const dynamic = "force-dynamic";

/** Auslieferung einer Variante (PRD v2 14.3, Schritt 4); die Regeln stehen in `resolveMediaDelivery`. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params;
  const viewer = await getSessionUserId(request.headers);
  return serveVariant(await resolveMediaDelivery(id, variante, viewer));
}
