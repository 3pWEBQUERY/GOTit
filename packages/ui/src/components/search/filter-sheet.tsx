"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "../actions/button";
import { Sheet, SheetContent, SheetTrigger } from "../feedback/sheet";
import { FilterGroupDefaults } from "./filter-group";

export interface FilterSheetProps {
  /** Titel des Sheets, zum Beispiel «Filter». */
  title: ReactNode;
  closeLabel: string;
  /** Zugänglicher Name des Griffs. Das Sheet kennt nur die volle Höhe; der Griff schliesst es. */
  handleLabel: string;
  /** Text des Buttons, zum Beispiel «Zurücksetzen». */
  resetLabel: string;
  onReset: () => void;
  resetDisabled?: boolean;
  /** Text des primären Buttons samt Trefferzahl, zum Beispiel «48 Profile anzeigen». Änderungen werden angesagt. */
  applyLabel: ReactNode;
  /** Wendet die Filter an. Danach schliesst das Sheet. */
  onApply: () => void;
  /** Auslöser, zum Beispiel ein `FilterBarButton`. */
  trigger?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Die Gruppen (`FilterGroup`); sie starten eingeklappt. */
  children: ReactNode;
}

/**
 * Filter der Suche auf Mobile: Sheet auf voller Höhe, deckend. Die Filter
 * wirken erst über den Button im haftenden Fuss, der die Trefferzahl nennt.
 */
export function FilterSheet({ title, closeLabel, handleLabel, resetLabel, onReset, resetDisabled, applyLabel, onApply, trigger, open: openProp, defaultOpen = false, onOpenChange, children }: FilterSheetProps) {
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = openProp ?? ownOpen;
  const groupDefaults = useMemo(() => ({ defaultOpen: false }), []);

  function setOpen(next: boolean) {
    setOwnOpen(next);
    onOpenChange?.(next);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent title={title} closeLabel={closeLabel} handleLabel={handleLabel} detent="full" onDetentChange={(detent) => (detent === "half" ? setOpen(false) : undefined)}>
        <div className="flex min-h-full flex-col">
          <div className="flex justify-end">
            <Button variant="quiet" disabled={resetDisabled} onClick={onReset} className="-mr-4">
              {resetLabel}
            </Button>
          </div>
          <FilterGroupDefaults.Provider value={groupDefaults}>
            <div className="flex flex-1 flex-col">{children}</div>
          </FilterGroupDefaults.Provider>
          <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-border bg-surface px-4 py-3">
            <Button
              variant="primary"
              width="full"
              onClick={() => {
                onApply();
                setOpen(false);
              }}
            >
              <span aria-live="polite" aria-atomic="true" className="tabular">
                {applyLabel}
              </span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
