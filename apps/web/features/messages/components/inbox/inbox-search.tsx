import { SearchField } from "@app/ui";

/**
 * Suche in eigenen Chats (v1 FR-CHAT-001): ein GET-Formular, das auch ohne
 * JavaScript funktioniert. Ansicht und Label bleiben als versteckte Felder.
 */
export function InboxSearch({
  action,
  value,
  hidden,
  labels,
}: {
  action: string;
  value: string;
  hidden: Record<string, string>;
  labels: { field: string; clear: string; hint: string };
}) {
  return (
    <form role="search" action={action} method="get">
      {Object.entries(hidden).map(([name, entry]) => (
        <input key={name} type="hidden" name={name} value={entry} />
      ))}
      <SearchField
        name="q"
        label={labels.field}
        clearLabel={labels.clear}
        defaultValue={value}
        hint={labels.hint}
        maxLength={80}
      />
    </form>
  );
}
