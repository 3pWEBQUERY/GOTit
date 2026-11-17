"use client";

import { TextField, type TextFieldProps } from "@app/ui";

/** `TextField` für Server-Komponenten (Filter als GET-Formular); das Feld selbst rendert im Client. */
export function TextInput(props: TextFieldProps) {
  return <TextField {...props} />;
}
