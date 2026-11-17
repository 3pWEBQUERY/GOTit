"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@app/core/locale";
import { createBookingRequestAction } from "../../actions/act";
import {
  clearMessage,
  draftQuery,
  readMessage,
  storeMessage,
  type RequestDraft,
} from "../../lib/draft";
import {
  createFailureField,
  needsRefresh,
  type CreateFailure,
} from "../../lib/errors";
import { findStart, slotDays } from "../../lib/slot-options";
import type { ClientSlots } from "../../lib/types";
import type { SlotValue } from "../shared/slot-fields";

export type RequestField = "day" | "time" | "duration" | "region" | "form";

export const FIELD_IDS: Record<Exclude<RequestField, "form">, string> = {
  day: "anfrage-tag",
  time: "anfrage-zeit",
  duration: "anfrage-dauer",
  region: "anfrage-region",
};

export interface RequestFormOptions {
  slug: string;
  slots: ClientSlots;
  initial: RequestDraft;
  /** Besucher: Senden führt zur Anmeldung und mit den Eingaben zurück. */
  signedIn: boolean;
}

export type SentRequest = { requestId: string; conversationId: string };

/**
 * Zustand und Senden des Anfrageformulars (v2 10.2). Besucher füllen es aus
 * und melden sich erst beim Senden an; Tag, Uhrzeit, Dauer und Region gehen
 * über `?weiter=` mit, die Nachricht über den Sitzungsspeicher (v2 8.2).
 */
export function useRequestForm({
  slug,
  slots,
  initial,
  signedIn,
}: RequestFormOptions) {
  const t = useTranslations("booking.form");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const days = useMemo(() => slotDays(slots.slots, slots.timeZone), [slots]);
  const initialStart = findStart(days, initial.day, initial.time);
  const [slot, setSlot] = useState<SlotValue>({
    day: days.some((entry) => entry.day === initial.day) ? initial.day : null,
    time: initialStart ? initial.time : null,
    duration:
      initialStart &&
      initial.duration &&
      initial.duration <= initialStart.maxMinutes
        ? initial.duration
        : null,
  });
  const [regionId, setRegionId] = useState<string | null>(initial.regionId);
  // Auf dem Server gibt es keinen Speicher (`null`); im Browser kommt die Nachricht vor der Anmeldung zurück.
  // Das Panel zeigt sich erst nach dem Einhängen, darum weicht das erste Rendern nicht ab.
  const [message, setMessage] = useState(() => readMessage(slug) ?? "");
  const [errors, setErrors] = useState<Partial<Record<RequestField, string>>>(
    {},
  );
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<SentRequest | null>(null);
  // Eingeschränkt durch die Moderation (v1 9.2): Hinweis mit Ende statt eines Fehlers am Feld.
  const [restricted, setRestricted] = useState<{ until: string | null } | null>(
    null,
  );
  // Eine Zeit aus dem Entwurf, die inzwischen vergeben ist, wird genannt statt still verworfen.
  const lostTime = Boolean(initial.day && initial.time && !initialStart);

  const dirty = Boolean(
    slot.day || slot.time || slot.duration || regionId || message.trim(),
  );

  function changeMessage(next: string) {
    setMessage(next);
    storeMessage(slug, next);
  }

  function focus(field: RequestField) {
    if (field === "form") return;
    window.requestAnimationFrame(() =>
      document.getElementById(FIELD_IDS[field])?.focus(),
    );
  }

  function fail(reason: CreateFailure | "network") {
    if (reason === "network") {
      setErrors({ form: t("errors.network") });
      return;
    }
    const field = createFailureField(reason, regionId !== null);
    setErrors({
      [field]: t(
        field === "region" ? "errors.invalidRegion" : `errors.${reason}`,
      ),
    });
    focus(field);
    if (needsRefresh(reason)) router.refresh();
  }

  function signInHref(): string {
    const weiter = getPathname({
      href: {
        pathname: "/p/[name]/anfrage",
        params: { name: slug },
        query: draftQuery({ ...slot, regionId }),
      },
      locale,
    });
    return getPathname({
      href: { pathname: "/anmelden", query: { weiter } },
      locale,
    });
  }

  async function submit() {
    const next: Partial<Record<RequestField, string>> = {};
    if (!slot.day) next.day = t("errors.dayMissing");
    if (!slot.time) next.time = t("errors.timeMissing");
    if (!slot.duration) next.duration = t("errors.durationMissing");
    setErrors(next);
    const first = (["day", "time", "duration"] as const).find(
      (field) => next[field],
    );
    if (first) {
      focus(first);
      return;
    }
    const start = findStart(days, slot.day, slot.time);
    if (!start || !slot.duration) {
      fail("unavailable");
      return;
    }
    if (!signedIn) {
      storeMessage(slug, message);
      router.push(signInHref());
      return;
    }
    setPending(true);
    const result = await createBookingRequestAction(slug, {
      startsAt: start.startsAt,
      durationMinutes: slot.duration,
      regionId,
      message,
    }).catch(() => null);
    setPending(false);
    if (!result) return fail("network");
    if (result.ok) {
      clearMessage(slug);
      setSent({
        requestId: result.requestId,
        conversationId: result.conversationId,
      });
      return;
    }
    if (result.reason === "sign-in") {
      storeMessage(slug, message);
      router.push(signInHref());
      return;
    }
    if (result.reason === "restricted") {
      setRestricted({ until: result.until ?? null });
      return;
    }
    fail(result.reason);
  }

  return {
    days,
    slot,
    setSlot: (value: SlotValue) => {
      setSlot(value);
      setErrors((current) => ({
        ...current,
        day: undefined,
        time: undefined,
        duration: undefined,
        form: undefined,
      }));
    },
    regionId,
    setRegionId,
    message,
    setMessage: changeMessage,
    errors,
    pending,
    sent,
    dirty,
    lostTime,
    restricted,
    submit,
    discard: () => clearMessage(slug),
  };
}
