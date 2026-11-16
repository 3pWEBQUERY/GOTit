import { getDb } from "@app/db";

export const dynamic = "force-dynamic";

/** Healthcheck für Railway: meldet gesund, wenn die Datenbank antwortet. */
export async function GET() {
  try {
    await getDb().$queryRaw`select 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
