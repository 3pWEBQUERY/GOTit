"use client";

import { Select } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ClientLabel } from "../../lib/types";

const ALL = "alle";

/** Filter nach Label im Studio-Postfach; der Wert steht in der URL. */
export function LabelFilter({
  labels,
  current,
  hrefFor,
}: {
  labels: readonly ClientLabel[];
  current: string | null;
  hrefFor: Record<string, string>;
}) {
  const t = useTranslations("messages.labels");
  const router = useRouter();
  return (
    <Select
      label={t("filter")}
      value={
        current && labels.some((label) => label.id === current) ? current : ALL
      }
      options={[
        { value: ALL, label: t("filterAll") },
        ...labels.map((label) => ({ value: label.id, label: label.name })),
      ]}
      onValueChange={(value) => {
        const target = hrefFor[value];
        if (target) router.push(target);
      }}
    />
  );
}
