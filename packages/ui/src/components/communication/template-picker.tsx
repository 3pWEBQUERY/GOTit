"use client";

import { FileText } from "lucide-react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "../actions/menu";

export interface MessageTemplate {
  key: string;
  title: string;
  /** Der Text, der im Composer landet. Im Menü ist eine Zeile als Vorschau zu sehen. */
  text: string;
}

export interface TemplatePickerProps {
  /** Beschriftung des Auslösers, zum Beispiel «Vorlage einfügen». */
  label: string;
  templates: readonly MessageTemplate[];
  /** Die Ansicht setzt den Text in den Composer. Dort bleibt er editierbar; gesendet wird nichts. */
  onSelect: (template: MessageTemplate) => void;
  /** Steht im Menü, wenn es keine Vorlagen gibt. */
  emptyText: string;
  /** Zeigt nur das Icon; die Beschriftung bleibt der zugängliche Name. */
  iconOnly?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Menü mit Textvorlagen (PRD 11.4): Titel und Vorschau. Die Auswahl landet editierbar im Composer. */
export function TemplatePicker({ label, templates, onSelect, emptyText, iconOnly, disabled, className }: TemplatePickerProps) {
  const icon = <FileText aria-hidden strokeWidth={1.5} />;
  return (
    <Menu>
      <MenuTrigger asChild>
        {iconOnly ? (
          <IconButton variant="outlined" label={label} icon={icon} disabled={disabled} className={className} />
        ) : (
          <Button icon={icon} disabled={disabled} className={className}>
            {label}
          </Button>
        )}
      </MenuTrigger>
      <MenuContent className="w-80">
        <MenuLabel>{label}</MenuLabel>
        {templates.length === 0 ? (
          <p className="px-3 py-2 text-small text-ink-muted">{emptyText}</p>
        ) : (
          templates.map((template) => (
            <MenuItem key={template.key} onSelect={() => onSelect(template)} className={cn("items-start")}>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-[550]">{template.title}</span>
                <span className="truncate text-ink-muted">{template.text}</span>
              </span>
            </MenuItem>
          ))
        )}
      </MenuContent>
    </Menu>
  );
}
