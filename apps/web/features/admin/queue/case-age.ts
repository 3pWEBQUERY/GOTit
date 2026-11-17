const HOUR = 3_600_000;

export type CaseAge = { unit: "lessThanHour" } | { unit: "hours" | "days"; count: number };

/** Alter eines Falls für «seit 2 Tagen»: unter einer Stunde, in Stunden, ab 24 Stunden in Tagen. */
export function caseAge(submittedAt: Date, now: Date): CaseAge {
  const hours = Math.floor(Math.max(0, now.getTime() - submittedAt.getTime()) / HOUR);
  if (hours < 1) return { unit: "lessThanHour" };
  if (hours < 24) return { unit: "hours", count: hours };
  return { unit: "days", count: Math.floor(hours / 24) };
}
