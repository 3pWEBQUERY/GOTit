"use client";

import { InputChoiceDemo } from "./input-choice-demo";
import { InputDateDemo } from "./input-date-demo";
import { InputFileDemo } from "./input-file-demo";
import { InputSelectDemo } from "./input-select-demo";
import { InputSettingDemo } from "./input-setting-demo";
import { InputTextDemo } from "./input-text-demo";

/** Testseite der Gruppe «Eingabe»: jede Komponente in allen Zuständen. */
export function InputSection() {
  return (
    <div className="flex flex-col gap-12">
      <InputTextDemo />
      <InputSelectDemo />
      <InputChoiceDemo />
      <InputSettingDemo />
      <InputDateDemo />
      <InputFileDemo />
    </div>
  );
}
