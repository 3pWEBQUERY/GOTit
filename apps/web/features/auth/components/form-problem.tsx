"use client";

import { InlineAlert } from "@app/ui";
import { useTranslations } from "next-intl";

/** Probleme, die ein ganzes Formular betreffen. Die Eingaben bleiben in jedem Fall erhalten (PRD 13). */
export type FormProblem = { kind: "rateLimited"; retryAfterSeconds: number } | { kind: "network" } | { kind: "unexpected" };

/** Zeigt ein Formularproblem am Ort: was passiert ist, was erhalten blieb, was jetzt geht. */
export function FormProblemAlert({ problem }: { problem: FormProblem | null }) {
  const t = useTranslations("auth.form");
  if (!problem) return null;
  if (problem.kind === "rateLimited") {
    const seconds = Math.max(1, Math.ceil(problem.retryAfterSeconds));
    const wait = seconds < 120 ? t("rateLimited.seconds", { seconds }) : t("rateLimited.minutes", { minutes: Math.ceil(seconds / 60) });
    return (
      <InlineAlert tone="error" title={t("rateLimited.title")}>
        {wait}
      </InlineAlert>
    );
  }
  return (
    <InlineAlert tone="error" title={t(`${problem.kind}.title`)}>
      {t(`${problem.kind}.body`)}
    </InlineAlert>
  );
}
