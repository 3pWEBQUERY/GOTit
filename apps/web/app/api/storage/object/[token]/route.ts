import { handleFsDownload } from "@/features/media/delivery/fs-routes";

export const dynamic = "force-dynamic";

/** Ersatz für die presigned Download-URL beim Treiber fs (Entwicklung und Tests); in der Produktion 404. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleFsDownload((await params).token);
}
