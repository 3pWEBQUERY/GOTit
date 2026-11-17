"use client";

import { FieldMessage, TextArea } from "@app/ui";
import { useTranslations } from "next-intl";
import { FIELD_NOTE_AREAS, type FieldNoteArea } from "../rules";

export const fieldNoteId = (area: FieldNoteArea) => `notiz-${area}`;

export interface FieldNotesProps {
  values: Readonly<Record<FieldNoteArea, string>>;
  onChange: (area: FieldNoteArea, value: string) => void;
  onBlur: (area: FieldNoteArea) => void;
  /** Fehler der Gruppe, zum Beispiel «mindestens ein Grund». */
  groupError?: string;
  errorFor: (area: FieldNoteArea) => string | undefined;
}

/** Bei «Zur Korrektur»: je Bereich ein optionaler Grund, mindestens einer ist Pflicht. */
export function FieldNotes({ values, onChange, onBlur, groupError, errorFor }: FieldNotesProps) {
  const t = useTranslations("admin.decision");
  return (
    <fieldset aria-describedby={groupError ? "notizen-fehler notizen-hinweis" : "notizen-hinweis"} className="flex min-w-0 flex-col gap-4">
      <legend className="mb-2 p-0 text-label text-ink">{t("fieldNotes")}</legend>
      <FieldMessage id="notizen-hinweis" kind="hint">
        {t("fieldNotesHint")}
      </FieldMessage>
      {groupError ? (
        <FieldMessage id="notizen-fehler" kind="error">
          {groupError}
        </FieldMessage>
      ) : null}
      {FIELD_NOTE_AREAS.map((area) => (
        <TextArea
          key={area}
          id={fieldNoteId(area)}
          label={t(`area.${area}`)}
          optionalLabel={t("optional")}
          rows={2}
          maxLength={500}
          value={values[area]}
          error={errorFor(area)}
          onChange={(event) => onChange(area, event.target.value)}
          onBlur={() => onBlur(area)}
        />
      ))}
    </fieldset>
  );
}
