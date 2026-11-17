import { handleFsUpload } from "@/features/media/delivery/fs-routes";

export const dynamic = "force-dynamic";

/** Ersatz für den presigned Upload des Buckets beim Treiber fs (Entwicklung und Tests); in der Produktion 404. */
export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  return handleFsUpload(request, (await params).token);
}
