import type { AccountTypeInput } from "./account-schemas";

/**
 * Die vier Kontotypen der Oberfläche (PRD 7.4). Clubs und Agenturen sind im
 * Schema beide eine Organisation; die Unterscheidung gibt es nur hier.
 */
export const ACCOUNT_CHOICES = ["member", "provider", "club", "agency"] as const;
export type AccountChoice = (typeof ACCOUNT_CHOICES)[number];

const TO_ACCOUNT_TYPE: Record<AccountChoice, AccountTypeInput> = {
  member: "MEMBER",
  provider: "PROVIDER",
  club: "ORGANIZATION",
  agency: "ORGANIZATION",
};

export function isAccountChoice(value: string): value is AccountChoice {
  return (ACCOUNT_CHOICES as readonly string[]).includes(value);
}

export function accountTypeFor(choice: AccountChoice | ""): AccountTypeInput | undefined {
  return choice === "" ? undefined : TO_ACCOUNT_TYPE[choice];
}

export function needsOrganization(choice: AccountChoice | ""): boolean {
  return choice === "club" || choice === "agency";
}
