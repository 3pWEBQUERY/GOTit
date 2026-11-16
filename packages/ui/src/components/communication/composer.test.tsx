import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./composer";
import { TemplatePicker, type MessageTemplate } from "./template-picker";

const templates: MessageTemplate[] = [
  { key: "a", title: "Beispielvorlage Begrüssung", text: "Beispieltext einer Vorlage" },
  { key: "b", title: "Beispielvorlage Absage", text: "Beispieltext einer Absage" },
];

function Example({ onSend, disabled, initial = "" }: { onSend: (text: string) => void; disabled?: boolean; initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <Composer
      value={value}
      onValueChange={setValue}
      onSend={() => onSend(value)}
      label="Nachricht an Beispielname"
      sendLabel="Nachricht senden"
      hint="Enter sendet, Umschalt + Enter fügt eine Zeile ein"
      disabled={disabled}
      disabledReason="Du hast diese Person blockiert"
      leading={<TemplatePicker iconOnly label="Vorlage einfügen" templates={templates} emptyText="Noch keine Vorlagen" onSelect={(template) => setValue(template.text)} />}
    />
  );
}

describe("Composer", () => {
  it("sendet mit Enter, aber nicht mit Umschalt + Enter", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Example onSend={onSend} />);
    const field = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Nachricht an Beispielname" });

    await user.type(field, "Beispieltext{Shift>}{Enter}{/Shift}zweite Zeile");
    expect(onSend).not.toHaveBeenCalled();
    expect(field.value).toBe("Beispieltext\nzweite Zeile");

    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("Beispieltext\nzweite Zeile");
    // Der Text bleibt stehen, bis die Ansicht ihn nach Erfolg leert.
    expect(field.value).toBe("Beispieltext\nzweite Zeile");
  });

  it("sendet mit dem Button und nie leeren Text", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Example onSend={onSend} />);
    const button = screen.getByRole("button", { name: "Nachricht senden" });
    await user.click(button);
    await user.type(screen.getByRole("textbox"), "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox"), "Beispieltext");
    await user.click(button);
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("behält gesperrt den Text, nennt die Begründung und sendet nicht", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Example onSend={onSend} disabled initial="Beispieltext im Entwurf" />);
    const field = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Nachricht an Beispielname" });
    expect(field.value).toBe("Beispieltext im Entwurf");
    expect(field.disabled).toBe(true);
    expect(screen.getByText("Du hast diese Person blockiert").id).toBe(field.getAttribute("aria-describedby"));
    await user.click(screen.getByRole("button", { name: "Nachricht senden" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(field.value).toBe("Beispieltext im Entwurf");
  });

  it("legt als Glas eine eigene Glasfläche nur unter 768 px unter die Eingabe", () => {
    const { container } = render(<Composer glass value="" onValueChange={() => undefined} onSend={() => undefined} label="Nachricht" sendLabel="Nachricht senden" />);
    const backdrop = container.querySelector(".glass");
    expect(backdrop?.className).toContain("md:hidden");
    expect(backdrop?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("TemplatePicker", () => {
  it("setzt die gewählte Vorlage editierbar in den Composer und sendet nichts", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<Example onSend={onSend} />);
    await user.click(screen.getByRole("button", { name: "Vorlage einfügen" }));
    await user.click(screen.getByRole("menuitem", { name: /Beispielvorlage Begrüssung/ }));

    const field = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Nachricht an Beispielname" });
    expect(field.value).toBe("Beispieltext einer Vorlage");
    expect(onSend).not.toHaveBeenCalled();
    await user.type(field, " mit Zusatz");
    expect(field.value).toBe("Beispieltext einer Vorlage mit Zusatz");
  });

  it("ruft onSelect mit der Vorlage und zeigt ohne Vorlagen den Leertext", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { rerender } = render(<TemplatePicker label="Vorlage einfügen" templates={templates} emptyText="Noch keine Vorlagen" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Vorlage einfügen" }));
    await user.click(screen.getByRole("menuitem", { name: /Beispielvorlage Absage/ }));
    expect(onSelect).toHaveBeenCalledWith(templates[1]);

    rerender(<TemplatePicker label="Vorlage einfügen" templates={[]} emptyText="Noch keine Vorlagen" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Vorlage einfügen" }));
    expect(screen.getByText("Noch keine Vorlagen")).toBeTruthy();
    expect(screen.queryByRole("menuitem")).toBeNull();
  });
});
