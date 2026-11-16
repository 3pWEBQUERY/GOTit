"use client";

import { TimeAvailabilityDemo } from "./time-availability-demo";
import { TimeCalendarDemo } from "./time-calendar-demo";
import { TimeStatusDemo } from "./time-status-demo";

/** Testseite der Gruppe «Zeit»: jede Komponente in allen Zuständen. Beispieldaten beziehen sich auf die Woche vom 16.11.2026. */
export function TimeSection() {
  return (
    <div className="flex flex-col gap-16">
      <TimeCalendarDemo />
      <TimeAvailabilityDemo />
      <TimeStatusDemo />
    </div>
  );
}
