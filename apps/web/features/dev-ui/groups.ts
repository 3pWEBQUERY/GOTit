/** Gruppen des Designsystems in der Reihenfolge der PRD (5.4). */
export const UI_GROUPS = ["shell", "actions", "input", "search", "profile", "communication", "time", "data", "community", "feedback"] as const;
export type UiGroup = (typeof UI_GROUPS)[number];

export const UI_GROUP_TITLES: Record<UiGroup, string> = {
  shell: "Shell",
  actions: "Aktionen",
  input: "Eingabe",
  search: "Suche",
  profile: "Profil",
  communication: "Kommunikation",
  time: "Zeit",
  data: "Daten",
  community: "Community",
  feedback: "Rückmeldung",
};

export function isUiGroup(value: string): value is UiGroup {
  return (UI_GROUPS as readonly string[]).includes(value);
}
