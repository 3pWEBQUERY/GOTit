import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";
import { CheckboxGroup } from "./checkbox-group";
import { RadioGroup } from "./radio-group";
import { SearchField } from "./search-field";
import { Select } from "./select";

describe("Checkbox", () => {
  it("trägt Label, Beschreibung und Fehler und liefert ein natives Feld im Formular", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <Checkbox label="Ich bin über 18 Jahre alt" description="Beispieltext" error="Bitte bestätige dein Alter." name="alter" />
      </form>,
    );
    const box = screen.getByRole("checkbox", { name: "Ich bin über 18 Jahre alt" });
    expect(box.getAttribute("aria-invalid")).toBe("true");
    const described = (box.getAttribute("aria-describedby") ?? "").split(" ").map((id) => document.getElementById(id)?.textContent);
    expect(described).toEqual(["Bitte bestätige dein Alter.", "Beispieltext"]);
    await user.click(box);
    expect(container.querySelector<HTMLInputElement>('input[name="alter"]')?.checked).toBe(true);
  });

  it("kennt den Zwischenzustand", () => {
    render(<Checkbox label="Alle Regionen" checked="indeterminate" />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("mixed");
  });

  it("gruppiert mit fieldset und legend", () => {
    render(
      <CheckboxGroup label="Sprachen" error="Wähle mindestens eine Sprache.">
        <Checkbox label="Deutsch" />
        <Checkbox label="Französisch" />
      </CheckboxGroup>,
    );
    const group = screen.getByRole("group", { name: "Sprachen" });
    expect(group.tagName).toBe("FIELDSET");
    expect(document.getElementById(group.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Wähle mindestens eine Sprache.");
  });
});

describe("RadioGroup", () => {
  it("hat fieldset und legend, wählt und meldet den Fehler", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="Ort des Termins"
        error="Wähle einen Ort."
        onValueChange={onValueChange}
        options={[
          { value: "studio", label: "Im Studio", description: "Beispieladresse" },
          { value: "besuch", label: "Hausbesuch" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Ort des Termins" }).tagName).toBe("FIELDSET");
    const group = screen.getByRole("radiogroup", { name: "Ort des Termins" });
    expect(group.getAttribute("aria-invalid")).toBe("true");
    const studio = screen.getByRole("radio", { name: "Im Studio" });
    expect(document.getElementById(studio.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Beispieladresse");
    await user.click(screen.getByRole("radio", { name: "Hausbesuch" }));
    expect(onValueChange).toHaveBeenCalledWith("besuch");
  });
});

describe("Select", () => {
  it("ist über das Label benannt, wählt und meldet den Fehler", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select
        label="Kanton"
        placeholder="Kanton wählen"
        error="Wähle einen Kanton."
        onValueChange={onValueChange}
        options={[
          { value: "zh", label: "Zürich" },
          { value: "be", label: "Bern" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Kanton" });
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(trigger.textContent).toContain("Kanton wählen");
    await user.click(trigger);
    await user.click(screen.getByRole("option", { name: "Bern" }));
    expect(onValueChange).toHaveBeenCalledWith("be");
    expect(trigger.textContent).toContain("Bern");
  });
});

describe("SearchField", () => {
  it("zeigt den Leeren-Button nur mit Inhalt und leert das Feld", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SearchField label="Suche" hideLabel clearLabel="Suche leeren" placeholder="Ort oder Name" onValueChange={onValueChange} />);
    const input = screen.getByRole("searchbox", { name: "Suche" }) as HTMLInputElement;
    expect(screen.queryByRole("button", { name: "Suche leeren" })).toBeNull();
    await user.type(input, "Bern");
    await user.click(screen.getByRole("button", { name: "Suche leeren" }));
    expect(input.value).toBe("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
    expect(document.activeElement).toBe(input);
  });

  it("sendet als Suchformular mit Enter", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchField label="Suche" clearLabel="Suche leeren" asForm action="/suche" name="q" onSearch={onSearch} />);
    const form = screen.getByRole("search") as HTMLFormElement;
    expect(form.getAttribute("action")).toBe("/suche");
    form.addEventListener("submit", (event) => event.preventDefault());
    await user.type(screen.getByRole("searchbox"), "Luzern{Enter}");
    expect(onSearch).toHaveBeenCalledWith("Luzern");
  });

  it("meldet Enter ohne Formular über onSearch", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchField label="Suche" clearLabel="Suche leeren" onSearch={onSearch} />);
    await user.type(screen.getByRole("searchbox"), "Basel{Enter}");
    expect(onSearch).toHaveBeenCalledWith("Basel");
  });
});
