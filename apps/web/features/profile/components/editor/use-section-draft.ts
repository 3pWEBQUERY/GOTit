"use client";

import type { ProfileSection } from "@app/core/provider-profile/schemas";
import { useEffect, useRef, useState } from "react";
import { sameValues, type FormValues } from "../../editor-values";

function storageKey(profileId: string, section: ProfileSection): string {
  return `profil-entwurf:${profileId}:${section}`;
}

function read(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ohne Speicher im Browser bleibt nur die Rückfrage beim Verlassen.
  }
}

/**
 * Ungespeicherte Eingaben eines Abschnitts bleiben im Tab erhalten
 * (sessionStorage, PRD v2 11.2): beim Verlassen, Neuladen oder Abbruch. Beim
 * nächsten Öffnen kommen sie zurück, mit Hinweis und «Änderungen verwerfen».
 */
export function useSectionDraft(profileId: string, section: ProfileSection, saved: FormValues, form: FormValues, setForm: (form: FormValues) => void) {
  const key = storageKey(profileId, section);
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    const draft = read(key);
    loaded.current = true;
    if (draft === null || sameValues(draft, saved[section])) {
      write(key, null);
      return;
    }
    setForm({ ...form, [section]: draft });
    // Den Zwischenspeicher gibt es nur im Browser: einmal nach dem Hydrieren übernehmen, sonst wichen Server und Browser ab.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestored(true);
    // Nur beim Öffnen des Abschnitts; spätere Änderungen schreibt der zweite Effekt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    write(key, sameValues(form[section], saved[section]) ? null : form[section]);
  }, [key, form, saved, section]);

  return {
    restored,
    discard() {
      write(key, null);
      setRestored(false);
      setForm({ ...form, [section]: saved[section] });
    },
    clear() {
      write(key, null);
      setRestored(false);
    },
  };
}
