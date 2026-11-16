/**
 * Geplante Aufgaben, eine pro Datei unter `tasks/` (PRD 15). Railway startet
 * den Dienst pro Aufgabe mit deren Namen als Argument; er erledigt sie und
 * beendet sich. Die ersten Aufgaben kommen mit den Schritten 1.5 und 1.9.
 */
export type CronTask = () => Promise<void>;

export const tasks: Readonly<Record<string, CronTask>> = {};
