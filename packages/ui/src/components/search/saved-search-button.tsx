import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "../actions/button";

export type SavedSearchState = "idle" | "saving" | "saved";

export interface SavedSearchButtonProps {
  state: SavedSearchState;
  /** Texte je Zustand, zum Beispiel «Suche speichern», «Suche wird gespeichert», «Suche gespeichert». */
  labels: { idle: string; saving: string; saved: string };
  /** Speichert die Suche oder entfernt sie wieder; die App entscheidet anhand des Zustands. */
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/** Button «Suche speichern». Gespeichert zeigt er ein anderes Icon, einen anderen Text und `aria-pressed`. */
export function SavedSearchButton({ state, labels, onClick, disabled, className }: SavedSearchButtonProps) {
  const saved = state === "saved";
  return (
    <Button
      aria-pressed={saved}
      loading={state === "saving"}
      disabled={disabled}
      onClick={onClick}
      icon={saved ? <BookmarkCheck aria-hidden strokeWidth={1.5} /> : <Bookmark aria-hidden strokeWidth={1.5} />}
      className={className}
    >
      {labels[state]}
    </Button>
  );
}
