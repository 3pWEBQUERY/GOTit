import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field, useFieldControl } from "./field";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";

function ContextInput() {
  const control = useFieldControl();
  return <input {...control} />;
}

describe("Field", () => {
  it("verbindet Label und Bedienelement über die Render-Prop", () => {
    render(<Field label="Beispielname">{(control) => <input {...control} />}</Field>);
    const input = screen.getByLabelText("Beispielname");
    expect(input.tagName).toBe("INPUT");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
  });

  it("verbindet Hinweis und Fehler über aria-describedby und setzt aria-invalid", () => {
    render(
      <Field label="E-Mail" hint="Format: name@beispiel.ch" error="Die Adresse braucht ein @-Zeichen.">
        {(control) => <input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("E-Mail");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const ids = (input.getAttribute("aria-describedby") ?? "").split(" ");
    expect(ids).toHaveLength(2);
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(["Die Adresse braucht ein @-Zeichen.", "Format: name@beispiel.ch"]);
    expect(document.getElementById(ids[0] ?? "")?.querySelector("svg")).not.toBeNull();
  });

  it("liefert dieselben Attribute über useFieldControl", () => {
    render(
      <Field label="Ort" error="Bitte gib einen Ort an.">
        <ContextInput />
      </Field>,
    );
    const input = screen.getByLabelText("Ort");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Bitte gib einen Ort an.");
  });

  it("beschriftet optionale Felder und verwendet kein Sternchen", () => {
    render(
      <Field label="Firma" optionalLabel="optional">
        {(control) => <input {...control} />}
      </Field>,
    );
    expect(screen.getByLabelText("Firma (optional)")).toBeTruthy();
    expect(document.body.textContent).not.toContain("*");
  });

  it("gibt ausserhalb eines Felds null zurück", () => {
    render(<ContextInput />);
    expect(screen.getByRole("textbox").id).toBe("");
  });
});

describe("TextField", () => {
  it("reicht native Attribute und ref durch", () => {
    let element: HTMLInputElement | null = null;
    render(
      <TextField
        label="Beispielname"
        name="name"
        defaultValue="Muster"
        readOnly
        ref={(node) => {
          element = node;
        }}
        error="Fehlt"
      />,
    );
    const input = screen.getByLabelText("Beispielname") as HTMLInputElement;
    expect(element).toBe(input);
    expect(input.name).toBe("name");
    expect(input.value).toBe("Muster");
    expect(input.readOnly).toBe(true);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});

describe("TextArea", () => {
  it("zeigt den Zeichenzähler und verbindet ihn mit dem Feld", () => {
    render(<TextArea label="Beschreibung" maxLength={200} defaultValue="Hallo" countLabel={(used, max) => `${used} von ${max} Zeichen`} />);
    const area = screen.getByLabelText("Beschreibung");
    expect(document.getElementById(area.getAttribute("aria-describedby") ?? "")?.textContent).toBe("5 von 200 Zeichen");
  });
});
