"use client";

import { Button, LoadingRegion, Skeleton, SkeletonCard, SkeletonRow } from "@app/ui";
import { useState } from "react";

/** Skeleton und LoadingRegion der Testseite «Rückmeldung». */
export function FeedbackLoadingDemo() {
  const [run, setRun] = useState(0);

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">Skeleton</h2>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Text</h3>
          <div className="flex max-w-reading flex-col gap-6">
            <Skeleton />
            <Skeleton lines={3} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Fläche und Kreis</h3>
          <div className="flex max-w-reading items-center gap-4">
            <Skeleton variant="circle" />
            <Skeleton variant="block" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Profilkarten</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-h3">Listenzeilen</h3>
          <div className="max-w-reading divide-y divide-border">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-h2">LoadingRegion</h2>
        <p className="max-w-prose text-small text-ink-muted">
          Skelette erscheinen nach 150 ms. In diesem Beispiel kommt der Hinweis schon nach 3 Sekunden, in der App nach 8.
        </p>
        <div>
          <Button onClick={() => setRun((current) => current + 1)}>{run === 0 ? "Laden starten" : "Laden neu starten"}</Button>
        </div>
        {run > 0 ? (
          <LoadingRegion
            key={run}
            label="Beispielnachrichten werden geladen"
            slowAfterMs={3000}
            className="max-w-reading"
            slowFallback={
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-small">Das Laden dauert länger als üblich.</p>
                <Button onClick={() => setRun((current) => current + 1)}>Erneut versuchen</Button>
              </div>
            }
          >
            <div className="divide-y divide-border">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          </LoadingRegion>
        ) : null}
      </section>
    </>
  );
}
