import { listRequests, type RequestSummary } from "@app/core/booking";
import type { MemberTab } from "../lib/types";

/**
 * Eigene Anfragen für `/termine` (v2 12.1): drei Tabs. «Offen» umfasst
 * «Angefragt» und «In Abstimmung», nach Beginn sortiert.
 */
export async function loadMemberRequests(
  userId: string,
  tab: MemberTab,
  now = new Date(),
): Promise<RequestSummary[]> {
  if (tab === "offen") {
    const [requested, negotiating] = await Promise.all([
      listRequests(userId, "MEMBER", "offen", now),
      listRequests(userId, "MEMBER", "abstimmung", now),
    ]);
    return [...requested, ...negotiating].sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
    );
  }
  return listRequests(userId, "MEMBER", tab, now);
}
