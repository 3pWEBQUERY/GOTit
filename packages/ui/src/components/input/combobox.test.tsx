import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "./combobox";
import { comboboxNavigate } from "./combobox-keys";

const options = [
  { value: "zh", label: "Zürich" },
  { value: "be", label: "Bern" },
  { value: "bs", label: "Basel", disabled: true },
  { value: "lu", label: "Luzern" },
];

function Demo({ onChange }: { onChange?: (value: string | null) => void }) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <form>
      <Combobox
        label="Ort"
        name="ort"
        options={options}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        emptyLabel="Keine Treffer"
      />
    </form>
  );
}

function activeText(input: HTMLElement) {
  return document.getElementById(input.getAttribute("aria-activedescendant") ?? "")?.textContent;
}

describe("Combobox", () => {
  it("hat die Rollen und Zustände des WAI-ARIA-Musters", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const input = screen.getByRole("combobox", { name: "Ort" });
    expect(input.getAttribute("aria-expanded")).toBe("false");
    await user.click(input);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    const listbox = screen.getByRole("listbox");
    expect(input.getAttribute("aria-controls")).toBe(listbox.id);
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("bewegt die Markierung mit Pfeiltasten, Home und End und überspringt deaktivierte Optionen", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const input = screen.getByRole("combobox");
    input.focus();
    await user.keyboard("{ArrowDown}");
    expect(activeText(input)).toBe("Zürich");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(activeText(input)).toBe("Luzern");
    await user.keyboard("{ArrowDown}");
    expect(activeText(input)).toBe("Zürich");
    await user.keyboard("{End}");
    expect(activeText(input)).toBe("Luzern");
    await user.keyboard("{Home}");
    expect(activeText(input)).toBe("Zürich");
    await user.keyboard("{ArrowUp}");
    expect(activeText(input)).toBe("Luzern");
    expect(document.activeElement).toBe(input);
  });

  it("wählt mit Enter, schliesst die Liste und füllt das versteckte Feld", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<Demo onChange={onChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith("be");
    expect(input.value).toBe("Bern");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="ort"]')?.value).toBe("be");
  });

  it("filtert beim Tippen und wählt per Klick", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "lu");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Luzern"]);
    await user.click(screen.getByRole("option", { name: "Luzern" }));
    expect(onChange).toHaveBeenCalledWith("lu");
    expect(input.value).toBe("Luzern");
  });

  it("zeigt und meldet, wenn es keine Treffer gibt", async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const input = screen.getByRole("combobox");
    await user.type(input, "xyz");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByRole("status").textContent).toBe("Keine Treffer");
    expect(screen.getAllByText("Keine Treffer").length).toBeGreaterThanOrEqual(2);
  });

  it("schliesst mit Escape und verwirft den getippten Text", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "ber");
    await user.keyboard("{Escape}");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.value).toBe("");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("wählt deaktivierte Optionen nicht", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Demo onChange={onChange} />);
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Basel" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("meldet den getippten Text und zeigt den Ladezustand", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<Combobox label="Ort" options={[]} value={null} onValueChange={() => undefined} onQueryChange={onQueryChange} filter="none" loading loadingLabel="Orte werden geladen" emptyLabel="Keine Treffer" />);
    await user.type(screen.getByRole("combobox"), "aa");
    expect(onQueryChange).toHaveBeenLastCalledWith("aa");
    expect(screen.getByRole("status").textContent).toBe("Orte werden geladen");
    expect(screen.queryByText("Keine Treffer")).toBeNull();
  });
});

describe("comboboxNavigate", () => {
  it("beginnt beim Öffnen bei der gewählten Option", () => {
    expect(comboboxNavigate("ArrowDown", options, { open: false, activeIndex: -1, value: "lu" })).toBe(3);
  });
  it("gibt für andere Tasten und bei geschlossener Liste für Home null zurück", () => {
    expect(comboboxNavigate("a", options, { open: true, activeIndex: 0, value: null })).toBeNull();
    expect(comboboxNavigate("Home", options, { open: false, activeIndex: -1, value: null })).toBeNull();
  });
  it("gibt -1 zurück, wenn es keine wählbare Option gibt", () => {
    expect(comboboxNavigate("ArrowDown", [], { open: true, activeIndex: -1, value: null })).toBe(-1);
  });
});
