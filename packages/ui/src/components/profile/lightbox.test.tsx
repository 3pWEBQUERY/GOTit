import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Lightbox } from "./lightbox";
import type { MediaItem } from "./media-frame";

const items: MediaItem[] = [
  { key: "a", alt: "Beispielbild eins", src: "/eins.jpg" },
  { key: "b", alt: "Beispielbild zwei", src: "/zwei.jpg" },
  { key: "c", alt: "Beispielbild drei", locked: { reason: "Für angemeldete Mitglieder" } },
];

function Example() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Medien öffnen
      </button>
      <Lightbox
        open={open}
        onOpenChange={setOpen}
        items={items}
        index={index}
        onIndexChange={setIndex}
        labels={{ title: "Medien von Beispielname", close: "Ansicht schliessen", previous: "Vorheriges Medium zeigen", next: "Nächstes Medium zeigen" }}
        counterLabel={(current, total) => `${current} / ${total}`}
        actions={(item) => <button type="button">{`${item.alt} melden`}</button>}
      />
    </>
  );
}

describe("Lightbox", () => {
  it("wechselt mit den Pfeiltasten und bleibt an den Enden stehen", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Medien öffnen" }));
    expect(screen.getByRole("dialog", { name: "Medien von Beispielname" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Beispielbild eins" })).toBeTruthy();
    expect(screen.getByText("1 / 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vorheriges Medium zeigen" }).getAttribute("aria-disabled")).toBe("true");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("1 / 3")).toBeTruthy();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("img", { name: "Beispielbild zwei" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Beispielbild zwei melden" })).toBeTruthy();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("3 / 3")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getAllByText("Für angemeldete Mitglieder").length).toBeGreaterThan(0);

    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("3 / 3")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Vorheriges Medium zeigen" }));
    expect(screen.getByText("2 / 3")).toBeTruthy();
  });

  it("schliesst mit Escape", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Medien öffnen" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
