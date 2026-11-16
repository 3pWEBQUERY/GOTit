"use client";

import type { PreferenceInput } from "@app/core/account";
import type { SwitchStatus } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { updatePreference } from "../../account/actions/update-preference";

export interface InstantSave {
  status: SwitchStatus;
  statusLabel: string | undefined;
  /** Speichert ein Feld. Gibt zurück, ob es gespeichert wurde; bei einem Fehler zeigt der Aufrufer wieder den alten Wert. */
  save: (input: PreferenceInput) => Promise<boolean>;
}

/** Sofort speichernde Einstellung mit Bestätigung am Ort (PRD 13): wird gespeichert, gespeichert, nicht gespeichert. */
export function useInstantSave(): InstantSave {
  const t = useTranslations("settings.status");
  const [status, setStatus] = useState<SwitchStatus>("idle");
  const latest = useRef(0);

  async function save(input: PreferenceInput): Promise<boolean> {
    const call = ++latest.current;
    setStatus("saving");
    let ok = false;
    try {
      ok = (await updatePreference(input)).ok;
    } catch {
      ok = false;
    }
    if (call === latest.current) setStatus(ok ? "saved" : "error");
    return ok;
  }

  return { status, statusLabel: status === "idle" ? undefined : t(status), save };
}

/**
 * Schalter auf einer Einstellung: zeigt den neuen Wert sofort und kehrt bei
 * einem Fehler zum alten zurück. `apply` wirkt sofort am Dokument, auch beim Zurücksetzen.
 */
export function usePreferenceSwitch(initial: boolean, toInput: (checked: boolean) => PreferenceInput, apply?: (checked: boolean) => void) {
  const [checked, setChecked] = useState(initial);
  const instant = useInstantSave();

  async function onCheckedChange(next: boolean) {
    const previous = checked;
    setChecked(next);
    apply?.(next);
    if (await instant.save(toInput(next))) {
      // Nach dem Speichern rendert der Server das Layout neu; die Wirkung wird danach noch einmal gesetzt.
      apply?.(next);
      return;
    }
    setChecked(previous);
    apply?.(previous);
  }

  return { checked, onCheckedChange: (next: boolean) => void onCheckedChange(next), status: instant.status, statusLabel: instant.statusLabel };
}
