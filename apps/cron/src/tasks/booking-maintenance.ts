import { expireOpenRequests, sendUpcomingReminders } from "@app/core/booking/maintenance";
import { createLogger } from "@app/core/observability";

const logger = createLogger("cron");

/**
 * Stündlich (PRD v1 FR-BOOKING-003, FR-BOOKING-005): offene Anfragen laufen ab,
 * bestätigte Termine der nächsten 24 Stunden bekommen einmal eine Erinnerung.
 */
export async function bookingMaintenance(): Promise<void> {
  const expired = await expireOpenRequests();
  const reminders = await sendUpcomingReminders();
  logger.info("booking_maintenance", { expired, reminders });
}
