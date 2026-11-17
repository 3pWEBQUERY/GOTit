/** Prisma meldet mit P2025, dass `findUniqueOrThrow` nichts fand (unbekannte Fall-ID). */
export function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "P2025";
}
