import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaGallery } from "./media-gallery";
import type { MediaItem } from "./media-frame";

const items: MediaItem[] = [
  { key: "a", alt: "Beispielbild eins", src: "/eins.jpg" },
  { key: "b", alt: "Beispielbild zwei", locked: { reason: "Für angemeldete Mitglieder" }, src: "/geheim.jpg" },
  { key: "c", alt: "Beispielbild drei", initials: "BN" },
];

describe("MediaGallery", () => {
  it("zeigt bei gesperrten Medien die Bedingung und kein Bild", () => {
    render(<MediaGallery label="Medien" items={items} onOpen={() => undefined} counterLabel={(current, total) => `${current} / ${total}`} />);
    const entries = screen.getAllByRole("listitem");
    const locked = entries[1] as HTMLElement;
    expect(within(locked).getByText("Für angemeldete Mitglieder")).toBeTruthy();
    expect(locked.querySelector("img")).toBeNull();
    expect(document.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByText("1 / 3")).toBeTruthy();
  });

  it("ruft onOpen mit der Stelle des Mediums und bietet den Button zu allen Medien", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<MediaGallery label="Medien" items={items} onOpen={onOpen} allLabel="Alle 18 Medien ansehen" total={18} counterLabel={(current, total) => `${current} / ${total}`} />);
    await user.click(screen.getByRole("button", { name: "Beispielbild drei" }));
    expect(onOpen).toHaveBeenLastCalledWith(2);
    await user.click(screen.getByRole("button", { name: "Alle 18 Medien ansehen" }));
    expect(onOpen).toHaveBeenLastCalledWith(0);
    expect(screen.getByText("1 / 18")).toBeTruthy();
  });
});
