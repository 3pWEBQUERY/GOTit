"use client";

import { Button, Select } from "@app/ui";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { queueQuery, type QueueParams } from "./queue-filter";

const ALL = "alle";

export interface QueueFilterOptions {
  status: { value: QueueParams["status"]; label: string }[];
  prioritaet: { value: NonNullable<QueueParams["prioritaet"]>; label: string }[];
  art: { value: NonNullable<QueueParams["art"]>; label: string }[];
  zuweisung: { value: NonNullable<QueueParams["zuweisung"]>; label: string }[];
}

export interface QueueFilterLabels {
  title: string;
  status: string;
  priority: string;
  target: string;
  assigned: string;
  all: string;
  reset: string;
}

/**
 * Filter der Warteschlange (v2 12.4). Jede Änderung steht sofort in der URL,
 * damit eine gefilterte Liste sich teilen und neu laden lässt.
 */
export function QueueFilters({ params, options, labels }: { params: QueueParams; options: QueueFilterOptions; labels: QueueFilterLabels }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function apply(next: Partial<QueueParams>) {
    const query = new URLSearchParams(queueQuery({ ...params, ...next, ansicht: "faelle" }));
    const text = query.toString();
    startTransition(() => router.replace(`${pathname}${text ? `?${text}` : ""}`, { scroll: false }));
  }

  const withAll = <Value extends string>(entries: { value: Value; label: string }[]) => [{ value: ALL, label: labels.all }, ...entries];
  const pick = <Value extends string>(value: string): Value | null => (value === ALL ? null : (value as Value));
  const filtered = params.status !== "aktiv" || params.prioritaet || params.art || params.zuweisung;

  return (
    <section aria-label={labels.title} aria-busy={pending} className="flex flex-wrap items-end gap-3" data-queue-filters>
      <Select
        className="w-full sm:w-52"
        label={labels.status}
        value={params.status}
        options={options.status}
        onValueChange={(value) => apply({ status: value as QueueParams["status"] })}
      />
      <Select
        className="w-full sm:w-44"
        label={labels.priority}
        value={params.prioritaet ?? ALL}
        options={withAll(options.prioritaet)}
        onValueChange={(value) => apply({ prioritaet: pick(value) })}
      />
      <Select className="w-full sm:w-44" label={labels.target} value={params.art ?? ALL} options={withAll(options.art)} onValueChange={(value) => apply({ art: pick(value) })} />
      <Select
        className="w-full sm:w-48"
        label={labels.assigned}
        value={params.zuweisung ?? ALL}
        options={withAll(options.zuweisung)}
        onValueChange={(value) => apply({ zuweisung: pick(value) })}
      />
      {filtered ? (
        <Button variant="quiet" onClick={() => apply({ status: "aktiv", prioritaet: null, art: null, zuweisung: null })}>
          {labels.reset}
        </Button>
      ) : null}
    </section>
  );
}
