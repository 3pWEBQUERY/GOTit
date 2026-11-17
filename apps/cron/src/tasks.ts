import { bookingMaintenance } from "./tasks/booking-maintenance";
import { purgeExpired } from "./tasks/purge-expired";
import { rebuildSearch } from "./tasks/rebuild-search-index";

/**
 * Geplante Aufgaben, eine pro Datei unter `tasks/` (PRD 15). Railway startet
 * den Dienst pro Aufgabe mit deren Namen als Argument; er erledigt sie und
 * beendet sich.
 */
export type CronTask = () => Promise<void>;

export const tasks: Readonly<Record<string, CronTask>> = {
  "booking-maintenance": bookingMaintenance,
  "purge-expired": purgeExpired,
  "rebuild-search-index": rebuildSearch,
};
