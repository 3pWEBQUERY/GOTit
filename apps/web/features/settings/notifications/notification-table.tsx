"use client";

import type { NotificationChannel, NotificationEvent } from "@app/core/account";
import { DataTable, InlineAlert, Switch, type DataTableColumn, type SwitchStatus } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { updatePreference } from "../../account/actions/update-preference";

type EventKey = NotificationEvent;
export type NotificationMatrix = Record<EventKey, Record<NotificationChannel, boolean>>;

interface Row {
  event: EventKey;
}

/**
 * Kanäle pro Ereignis (PRD 7.5). Schalter speichern sofort und bestätigen am
 * Ort. Sicherheitshinweise per E-Mail sind gesperrt und erklärt; Push ist als
 * «noch nicht verfügbar» beschriftet statt eines Schalters, der scheitert (PRD 13).
 */
export function NotificationTable({ events, initial, locked }: { events: readonly EventKey[]; initial: NotificationMatrix; locked: readonly EventKey[] }) {
  const t = useTranslations("settings");
  const [values, setValues] = useState(initial);
  const [statuses, setStatuses] = useState<Partial<Record<EventKey, SwitchStatus>>>({});
  const latest = useRef<Partial<Record<EventKey, number>>>({});

  async function toggle(event: EventKey, enabled: boolean) {
    const call = (latest.current[event] ?? 0) + 1;
    latest.current[event] = call;
    setValues((current) => ({ ...current, [event]: { ...current[event], email: enabled } }));
    setStatuses((current) => ({ ...current, [event]: "saving" }));
    let ok = false;
    try {
      ok = (await updatePreference({ notification: { event, channel: "email", enabled } })).ok;
    } catch {
      ok = false;
    }
    if (latest.current[event] !== call) return;
    if (!ok) setValues((current) => ({ ...current, [event]: { ...current[event], email: !enabled } }));
    setStatuses((current) => ({ ...current, [event]: ok ? "saved" : "error" }));
  }

  const eventName = (event: EventKey) => t(`notifications.events.${event}`);

  const columns: DataTableColumn<Row>[] = [
    { id: "event", header: t("notifications.event"), priority: 1, cell: ({ event }) => <span className="text-body font-[550]">{eventName(event)}</span> },
    {
      id: "email",
      header: t("notifications.email"),
      priority: 2,
      cell: ({ event }) => {
        const isLocked = locked.includes(event);
        const status = statuses[event] ?? "idle";
        return (
          <Switch
            label={<span className="sr-only">{t("notifications.switchLabel", { channel: t("notifications.email"), event: eventName(event) })}</span>}
            description={isLocked ? t("notifications.securityLocked") : undefined}
            checked={isLocked ? true : values[event].email}
            disabled={isLocked}
            onCheckedChange={(enabled) => void toggle(event, enabled)}
            status={isLocked ? undefined : status}
            statusLabel={status === "idle" ? undefined : t(`status.${status}`)}
          />
        );
      },
    },
    { id: "push", header: t("notifications.push"), priority: 3, cell: () => <span className="text-small text-ink-muted">{t("notifications.pushUnavailable")}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <InlineAlert title={t("notifications.pushNote")}>{t("notifications.discretion")}</InlineAlert>
      <DataTable caption={t("notifications.tableCaption")} captionHidden columns={columns} rows={events.map((event) => ({ event }))} getRowId={(row) => row.event} />
    </div>
  );
}
