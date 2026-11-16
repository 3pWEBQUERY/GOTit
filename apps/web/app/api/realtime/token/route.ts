import { createRealtimeToken, getSessionUserId } from "@app/auth";

export const dynamic = "force-dynamic";

/** Gibt angemeldeten Konten ein kurzlebiges Token für den Echtzeit-Dienst (PRD 14.1). */
export async function POST(request: Request) {
  const userId = await getSessionUserId(request.headers);
  if (!userId) return Response.json({ error: "unauthenticated" }, { status: 401 });
  return Response.json(
    { token: createRealtimeToken(userId, process.env.BETTER_AUTH_SECRET) },
    { headers: { "cache-control": "no-store" } },
  );
}
