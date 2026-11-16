/** Reine Zeitlogik für `TimeField`: 24 Stunden, Wert als `HH:MM`. */

const TIME_PATTERN = /^(\d{1,2})[:.](\d{2})$/;
const COMPACT_PATTERN = /^(\d{2})(\d{2})$/;

/**
 * Liest eine Eingabe wie `9:05`, `09:05`, `14.30` oder `1430` und gibt `HH:MM` zurück.
 * `null`, wenn es die Uhrzeit nicht gibt (`24:00`, `12:60`) oder die Form nicht stimmt.
 */
export function parseTime(text: string): string | null {
  const trimmed = text.trim();
  const match = TIME_PATTERN.exec(trimmed) ?? COMPACT_PATTERN.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Minuten seit Mitternacht für einen gültigen Wert `HH:MM`. */
export function timeToMinutes(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** Prüft, ob eine Zeit auf dem Raster von `step` Minuten liegt (zum Beispiel 15: 09:00, 09:15 …). */
export function isOnStep(time: string, step: number | undefined): boolean {
  return !step || step <= 0 || timeToMinutes(time) % step === 0;
}
