import { getDb } from "@app/db";
import { requestSearchReindex } from "../search/reindex";

/** Nach einem Entscheid der Moderation: Titelbild und «Fotos geprüft» im Suchindex nachziehen. */
export async function reindexMediaOwner(mediaId: string): Promise<void> {
  const media = await getDb().mediaAsset.findUnique({ where: { id: mediaId }, select: { providerProfileId: true } });
  if (media?.providerProfileId) await requestSearchReindex(media.providerProfileId);
}
