/** Geschützte Route eines Chat-Bilds; sie leitet nur Beteiligte auf eine kurzlebige URL weiter. */
export function attachmentSrc(attachmentId: string): string {
  return `/api/nachrichten/bilder/${encodeURIComponent(attachmentId)}`;
}
