import { InlineAlert } from "@app/ui";

/** Fehlt ein Recht, steht der Grund am Ort der Aktion (PRD 13: nie ein Klick, der mit 403 endet). */
export function PermissionNote({ text }: { text: string }) {
  return (
    <div className="max-w-reading" data-permission-note>
      <InlineAlert title={text} />
    </div>
  );
}
