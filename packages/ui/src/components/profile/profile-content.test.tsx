import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactBar } from "./contact-bar";
import { RateTable } from "./rate-table";
import { ReviewItem } from "./review-item";

const columns = { duration: "Dauer", price: "Preis", note: "Hinweis" };

describe("RateTable", () => {
  it("zeigt Preise als Tabelle mit Beschriftung und Stand", () => {
    render(
      <RateTable
        caption="Preise von Beispielname"
        columns={columns}
        rows={[{ key: "1", duration: "1 Std.", price: "CHF 000", note: "Beispielhinweis" }]}
        emptyText="Preise auf Anfrage"
        updatedText="Stand: 02.11.2026"
      />,
    );
    expect(screen.getByRole("table", { name: "Preise von Beispielname" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByRole("rowheader", { name: "1 Std." })).toBeTruthy();
    expect(screen.getByText("Stand: 02.11.2026")).toBeTruthy();
    expect(screen.queryByText("Preise auf Anfrage")).toBeNull();
  });

  it("zeigt ohne Zeilen den Text statt einer leeren Tabelle", () => {
    render(<RateTable caption="Preise" columns={columns} rows={[]} emptyText="Preise auf Anfrage" updatedText="Stand: 02.11.2026" />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Preise auf Anfrage")).toBeTruthy();
  });
});

describe("ContactBar", () => {
  const request = { label: "Termin anfragen", href: "/p/beispielname/anfrage" };
  const message = { label: "Nachricht schreiben", onClick: () => undefined };

  it("zeigt die primäre Aktion als Link und die sekundäre als Button", () => {
    render(<ContactBar variant="sticky-panel" label="Kontakt" request={request} message={message} />);
    expect(screen.getByRole("link", { name: "Termin anfragen" }).getAttribute("href")).toBe("/p/beispielname/anfrage");
    expect(screen.getByRole("button", { name: "Nachricht schreiben" })).toBeTruthy();
  });

  it.each(["sticky-panel", "mobile-bar"] as const)("zeigt pausiert (%s) nur den Hinweis ohne Kontaktaktionen", (variant) => {
    render(<ContactBar variant={variant} label="Kontakt" request={request} message={message} paused="Dieses Profil ist zurzeit pausiert" />);
    expect(screen.getByText("Dieses Profil ist zurzeit pausiert")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("zeigt ohne Terminanfrage nur die eigene Nachrichten-Aktion und den Hinweis darunter", () => {
    render(<ContactBar variant="sticky-panel" label="Kontakt" message={<button type="button">Nachricht schreiben</button>} note="Terminanfragen kommen später." />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Nachricht schreiben"]);
    expect(screen.getByText("Terminanfragen kommen später.")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("ist als mobile Leiste Glas und ab 768 px ausgeblendet", () => {
    render(<ContactBar variant="mobile-bar" label="Kontakt" request={request} message={message} />);
    const bar = screen.getByRole("region", { name: "Kontakt" });
    expect(bar.className).toContain("glass");
    expect(bar.className).toContain("md:hidden");
  });
});

describe("ReviewItem", () => {
  it("zeigt Kategorien als Text ohne Sterne und die Stellungnahme darunter", () => {
    const { container } = render(
      <ReviewItem
        date="12.10.2026"
        verification="Nach bestätigtem Termin"
        ratings={[{ key: "k", label: "Kommunikation", value: "5 von 5" }]}
        response={{ label: "Stellungnahme von Beispielname", text: "Beispieltext einer Stellungnahme" }}
      >
        Beispieltext einer Bewertung
      </ReviewItem>,
    );
    expect(screen.getByText("Nach bestätigtem Termin")).toBeTruthy();
    expect(screen.getByRole("term").textContent).toBe("Kommunikation");
    expect(screen.getByRole("definition").textContent).toBe("5 von 5");
    expect(container.querySelector(".lucide-star")).toBeNull();
    const text = screen.getByText("Beispieltext einer Bewertung");
    const response = screen.getByText("Beispieltext einer Stellungnahme");
    expect(text.compareDocumentPosition(response) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
