import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfileCard } from "./profile-card";

const signals = [
  { key: "id", label: "Identität geprüft" },
  { key: "photos", label: "Fotos geprüft" },
  { key: "phone", label: "Telefon geprüft" },
];

describe("ProfileCard", () => {
  it("verlinkt die ganze Karte über den Namen und zeigt ohne Bild die Initialen", () => {
    const { container } = render(<ProfileCard href="/p/beispielname" name="Beispielname Muster" region="Beispielstadt" />);
    const link = screen.getByRole("link", { name: "Beispielname Muster" });
    expect(link.getAttribute("href")).toBe("/p/beispielname");
    expect(link.className).toContain("after:absolute");
    expect(link.className).toContain("after:inset-0");
    expect(screen.getByRole("heading", { level: 3, name: "Beispielname Muster" })).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("BM")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("zeigt das Bild träge geladen und setzt die Ebene der Überschrift", () => {
    render(<ProfileCard href="/p/beispielname" name="Beispielname" headingLevel={4} image={{ src: "/beispiel.jpg", alt: "Beispielbild" }} />);
    const image = screen.getByRole("img", { name: "Beispielbild" });
    expect(image.getAttribute("loading")).toBe("lazy");
    expect(image.getAttribute("decoding")).toBe("async");
    expect(screen.getByRole("heading", { level: 4 })).toBeTruthy();
  });

  it("führt den Favorit als eigenen Button mit Namen ausserhalb des Links", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <ProfileCard
        href="/p/beispielname"
        name="Beispielname"
        favorite={{ label: "Beispielname als Favorit speichern", pressed: false, onPressedChange }}
      />,
    );
    const button = screen.getByRole("button", { name: "Beispielname als Favorit speichern" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("link").contains(button)).toBe(false);
    await user.click(button);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it("zeigt «Anzeige» nur bei bezahlter Platzierung", () => {
    const { rerender } = render(<ProfileCard href="/p/a" name="Beispielname" />);
    expect(screen.queryByText("Anzeige")).toBeNull();
    rerender(<ProfileCard href="/p/a" name="Beispielname" sponsoredLabel="Anzeige" />);
    expect(screen.getByText("Anzeige")).toBeTruthy();
  });

  it("zeigt höchstens zwei Signale und Verfügbarkeit nur, wenn sie übergeben ist", () => {
    const { rerender } = render(<ProfileCard href="/p/a" name="Beispielname" signals={signals} />);
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("Telefon geprüft")).toBeNull();
    expect(screen.queryByText("Heute verfügbar")).toBeNull();
    rerender(<ProfileCard href="/p/a" name="Beispielname" signals={signals} availability="Heute verfügbar" />);
    expect(screen.getByText("Heute verfügbar")).toBeTruthy();
  });

  it("zeigt in der Listenansicht Sprachen, Preis und nächste Verfügbarkeit", () => {
    render(
      <ProfileCard variant="list" href="/p/a" name="Beispielname" languages="Spricht Deutsch" priceFrom="Preis ab CHF 000" nextAvailability="Nächster Termin morgen" />,
    );
    expect(screen.getByText("Spricht Deutsch")).toBeTruthy();
    expect(screen.getByText("Preis ab CHF 000")).toBeTruthy();
    expect(screen.getByText("Nächster Termin morgen")).toBeTruthy();
  });
});
