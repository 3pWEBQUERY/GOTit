import { notFound } from "next/navigation";
import { getViewerOrganizationMedia } from "@/features/media/queries/get-own-media";
import { requireOrganization } from "@/features/organization/queries/membership";

/**
 * Prüft vor dem Ladezustand, ob das Medium zur Organisation gehört und die
 * Person es bearbeiten darf; fremde und unbekannte IDs ergeben eine echte 404.
 */
export default async function OrganizationMediaLayout({ children, params }: LayoutProps<"/[locale]/studio/o/[org]/medien/[id]">) {
  const { org, id } = await params;
  const context = await requireOrganization(org);
  const media = await getViewerOrganizationMedia(org, id);
  if (!context.can("media.edit") || !media || media.status === "FAILED") notFound();
  return children;
}
