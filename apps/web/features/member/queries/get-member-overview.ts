export interface OverviewEntry {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export interface MemberOverview {
  openRequests: OverviewEntry[];
  unreadConversations: OverviewEntry[];
  upcomingAppointments: OverviewEntry[];
  recentlyViewed: OverviewEntry[];
}

/**
 * Daten der Übersicht `/ich` (PRD 12.1). Anfragen, Termine und Nachrichten
 * gibt es erst mit den Schritten 1.8 und 1.9; bis dahin sind die Listen
 * ehrlich leer statt mit Beispieldaten gefüllt.
 */
export async function getMemberOverview(_userId: string): Promise<MemberOverview> {
  return { openRequests: [], unreadConversations: [], upcomingAppointments: [], recentlyViewed: [] };
}
