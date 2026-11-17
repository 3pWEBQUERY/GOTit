import type { RawParams } from "@app/core/search/query";

/** `URLSearchParams` als Objekt, wie Next es Seiten als `searchParams` übergibt. */
export function searchParamsRecord(params: URLSearchParams): RawParams {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length === 1 ? (values[0] ?? "") : values;
  }
  return record;
}
