import { listOwnMedia, mediaUrl, type OwnMedia } from "@app/core/media";
import type { Locale } from "@app/core/locale";
import { createHref } from "../../shell/nav/href";
import { WITH_VARIANTS, type LibraryData, type LibraryItem } from "../library/types";

export function toLibraryItem(media: OwnMedia, detailHref: string | null): LibraryItem {
  return {
    id: media.id,
    status: media.status,
    visibility: media.visibility,
    isCover: media.isCover,
    altText: media.altText,
    width: media.width,
    height: media.height,
    dominantColor: media.dominantColor,
    failureReason: media.failureReason,
    moderationNote: media.moderationNote,
    thumbSrc: WITH_VARIANTS.includes(media.status) ? mediaUrl(media.id, 640, "webp") : null,
    detailHref,
  };
}

/** Bibliothek der angemeldeten Person; null ohne eigenes Profil. `withDetail: false` im Onboarding. */
export async function loadLibrary(userId: string, locale: Locale, { withDetail }: { withDetail: boolean }): Promise<LibraryData | null> {
  const library = await listOwnMedia(userId);
  if (!library) return null;
  const href = createHref(locale);
  return {
    items: library.media.map((media) =>
      toLibraryItem(media, withDetail && media.status !== "FAILED" ? href({ pathname: "/studio/medien/[id]", params: { id: media.id } }) : null),
    ),
    quota: library.quota,
    hasUploadedBefore: library.hasUploadedBefore,
    canUpload: library.canUpload,
  };
}
