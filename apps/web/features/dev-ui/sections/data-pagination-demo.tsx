"use client";

import { Button, PageList, Pagination } from "@app/ui";
import { useEffect, useState } from "react";

const TOTAL = 48;
const PAGE_SIZE = 24;

const pageLabels = { previous: "Vorherige Seite", next: "Nächste Seite", page: (page: number) => `Seite ${page}` };

/** Pagination und PageList der Testseite «Daten». */
export function DataPaginationDemo() {
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(5);

  // Das Beispiel hat keinen Server; nach kurzer Zeit gelten die Einträge als geladen.
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => {
      setShown((current) => Math.min(TOTAL, current + PAGE_SIZE));
      setLoading(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [loading]);

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Pagination</h2>
        <p className="max-w-prose text-small text-ink-muted">«Weitere laden» statt endlosem Scrollen. Alle Zahlen sind Beispielwerte.</p>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Im Ablauf</h3>
          <Pagination loadMoreLabel={shown < TOTAL ? `Weitere ${Math.min(PAGE_SIZE, TOTAL - shown)} laden` : undefined} rangeText={`1–${shown} von ${TOTAL}`} loading={loading} onLoadMore={() => setLoading(true)} />
          {shown >= TOTAL ? (
            <div className="flex justify-center">
              <Button variant="quiet" onClick={() => setShown(PAGE_SIZE)}>
                Beispiel zurücksetzen
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Lädt</h3>
          <Pagination loadMoreLabel="Weitere 24 laden" rangeText="1–24 von 96" loading />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Als Link mit Seitenzahl in der Adresse</h3>
          <Pagination loadMoreLabel="Weitere 24 laden" rangeText="1–24 von 96" href="?seite=2" />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Alles geladen</h3>
          <Pagination rangeText="1–48 von 48" />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">PageList</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Viele Seiten, als Buttons</h3>
          <PageList label="Seiten der Beispieltabelle" page={page} pageCount={12} labels={pageLabels} onPageChange={setPage} />
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Wenige Seiten, als Links</h3>
          <PageList label="Seiten der Beispielliste" page={1} pageCount={3} labels={pageLabels} getHref={(target) => `?seite=${target}`} />
        </div>
      </section>
    </>
  );
}
