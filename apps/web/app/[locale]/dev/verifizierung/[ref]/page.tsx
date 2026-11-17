import { isLocale } from "@app/core/locale";
import { InlineAlert } from "@app/ui";
import type { Metadata } from "next";
import { getViewer } from "@/features/shell/queries/get-viewer";
import { TestProviderForm } from "@/features/verification/components/test-provider-form";
import { getTestCheck } from "@/features/verification/queries/get-test-check";

export const metadata: Metadata = {
  title: "Test-Dienstleister",
  robots: { index: false },
};

interface Props {
  params: Promise<{ locale: string; ref: string }>;
  searchParams: Promise<{ weiter?: string | string[] }>;
}

/** Simulierte Prüfung: Die prüfende Person wählt das Ergebnis selbst. Texte deutsch wie /dev/ui. */
export default async function TestProviderPage({ params, searchParams }: Props) {
  const [{ locale, ref }, query, viewer] = await Promise.all([params, searchParams, getViewer()]);
  const weiter = typeof query.weiter === "string" ? query.weiter : "";
  const check = viewer.kind === "account" ? await getTestCheck(ref, viewer.userId) : null;

  return (
    <div className="flex flex-col gap-6">
      <InlineAlert tone="warning" title="Test-Dienstleister, keine echte Prüfung">
        Diese Seite gibt es nur in Entwicklung und Tests. Hier wird kein Ausweis geprüft; du wählst das Ergebnis selbst.
      </InlineAlert>
      <h1 className="text-h1">Identitätsprüfung simulieren</h1>
      {viewer.kind !== "account" ? (
        <p className="text-body">Melde dich mit dem Konto an, das die Prüfung gestartet hat.</p>
      ) : !check ? (
        <p className="text-body">Diese Prüfung gibt es nicht oder sie gehört zu einem anderen Konto.</p>
      ) : check.status !== "PENDING" ? (
        <p className="text-body">Diese Prüfung ist bereits abgeschlossen. Starte im Studio eine neue Prüfung.</p>
      ) : (
        <TestProviderForm externalRef={ref} weiter={weiter} locale={isLocale(locale) ? locale : "de"} />
      )}
    </div>
  );
}
