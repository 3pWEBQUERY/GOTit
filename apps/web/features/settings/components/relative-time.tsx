import { getFormatter } from "next-intl/server";

/** Relative Angabe («vor 3 Tagen») mit dem genauen Datum im Tooltip (PRD 13). */
export async function RelativeTime({ date, now }: { date: Date; now: Date }) {
  const format = await getFormatter();
  const exact = format.dateTime(date, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <time dateTime={date.toISOString()} title={exact} className="tabular">
      {format.relativeTime(date, now)}
    </time>
  );
}
