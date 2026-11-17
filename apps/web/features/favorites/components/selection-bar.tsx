"use client";

import { Button } from "@app/ui";
import { CheckSquare, FolderInput, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface SelectionBarProps {
  selected: number;
  total: number;
  canMove: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onMove: () => void;
  onRemove: () => void;
}

/**
 * Mehrfachauswahl mit Sammelaktionen (PRD v2 12.1, PRD 13), wie in der
 * Medienbibliothek. Die Anzahl wird angesagt; ohne Auswahl bleibt nur
 * «Alle auswählen».
 */
export function SelectionBar({
  selected,
  total,
  canMove,
  onSelectAll,
  onClear,
  onMove,
  onRemove,
}: SelectionBarProps) {
  const t = useTranslations("favorites.selection");
  return (
    <div
      role="region"
      aria-label={t("label")}
      className="flex flex-wrap items-center gap-2 border-y border-border py-2"
      data-selection-bar
    >
      <p
        role="status"
        aria-live="polite"
        className="tabular mr-auto text-small text-ink"
      >
        {selected > 0 ? (
          t("count", { count: selected })
        ) : (
          <span className="text-ink-muted">{t("none")}</span>
        )}
      </p>
      {selected < total ? (
        <Button
          variant="quiet"
          icon={<CheckSquare aria-hidden strokeWidth={1.5} />}
          onClick={onSelectAll}
          data-selection-toggle
        >
          {t("selectAll")}
        </Button>
      ) : null}
      {selected > 0 ? (
        <>
          {canMove ? (
            <Button
              icon={<FolderInput aria-hidden strokeWidth={1.5} />}
              onClick={onMove}
            >
              {t("move")}
            </Button>
          ) : null}
          <Button
            icon={<Trash2 aria-hidden strokeWidth={1.5} />}
            onClick={onRemove}
          >
            {t("remove")}
          </Button>
          <Button
            variant="quiet"
            icon={<X aria-hidden strokeWidth={1.5} />}
            onClick={onClear}
            data-selection-toggle
          >
            {t("clear")}
          </Button>
        </>
      ) : null}
    </div>
  );
}
