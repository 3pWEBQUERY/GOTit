import { headers } from "next/headers";

/** Pfad der laufenden Anfrage, vom Proxy gesetzt; Ziel für `?weiter=` (PRD 8.2). */
export async function getReturnPath(): Promise<string | null> {
  return (await headers()).get("x-return-path");
}
