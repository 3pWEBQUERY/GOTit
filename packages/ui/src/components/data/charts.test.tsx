import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BarChart } from "./bar-chart";
import { LineChart } from "./line-chart";
import { StatFigure } from "./stat-figure";

const tableLabels = { show: "Als Tabelle anzeigen", hide: "Als Grafik anzeigen", labelColumn: "Tag", valueColumn: "Profilaufrufe", noteColumn: "Quote" };
const formatValue = (value: number) => `${value} Aufrufe`;
const days = [
  { label: "Mo", value: 40 },
  { label: "Di", value: 62 },
  { label: "Mi", value: 51 },
];

describe("LineChart", () => {
  it("zeigt bei leeren Daten den Leerzustand statt eines Diagramms, mit Fussnote", () => {
    const { container } = render(<LineChart title="Profilaufrufe pro Tag" data={[]} formatValue={formatValue} emptyText="Noch keine Daten für diesen Zeitraum" footnote="Gezählt wird jeder Aufruf." tableLabels={tableLabels} />);
    expect(screen.getByRole("region", { name: "Profilaufrufe pro Tag" })).toBeTruthy();
    expect(screen.getByText("Noch keine Daten für diesen Zeitraum")).toBeTruthy();
    expect(screen.getByText("Gezählt wird jeder Aufruf.")).toBeTruthy();
    expect(container.querySelector("[data-chart-canvas]")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("blendet die Zeichnung für Screenreader aus und schaltet zur Tabelle mit denselben Werten", async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart title="Profilaufrufe pro Tag" data={days} formatValue={formatValue} emptyText="Leer" footnote="Gezählt wird jeder Aufruf." tableLabels={tableLabels} />);
    expect(screen.getByRole("heading", { level: 3, name: "Profilaufrufe pro Tag" })).toBeTruthy();
    expect(container.querySelector("[data-chart-canvas]")?.getAttribute("aria-hidden")).toBe("true");

    // Die Tabelle ist schon in der Grafikansicht die Textfassung für Screenreader.
    const table = screen.getByRole("table", { name: "Profilaufrufe pro Tag" });
    expect(table.parentElement?.className).toContain("sr-only");

    await user.click(screen.getByRole("button", { name: "Als Tabelle anzeigen" }));
    expect(container.querySelector("[data-chart-canvas]")).toBeNull();
    expect(table.parentElement?.className).not.toContain("sr-only");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tag", "Profilaufrufe"]);
    expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["Mo", "Di", "Mi"]);
    expect(within(table).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["40 Aufrufe", "62 Aufrufe", "51 Aufrufe"]);

    await user.click(screen.getByRole("button", { name: "Als Grafik anzeigen" }));
    expect(container.querySelector("[data-chart-canvas]")).toBeTruthy();
  });
});

describe("BarChart", () => {
  const funnel = [
    { label: "Einblendungen in der Suche", value: 1200, note: "100 %" },
    { label: "Profilaufrufe", value: 400, note: "33 %" },
  ];

  it("zeigt die Quoten des Trichters in der Tabellenansicht", async () => {
    const user = userEvent.setup();
    render(<BarChart layout="horizontal" title="Trichter" data={funnel} formatValue={String} emptyText="Leer" footnote="Beispielwerte" tableLabels={tableLabels} />);
    await user.click(screen.getByRole("button", { name: "Als Tabelle anzeigen" }));
    const table = screen.getByRole("table", { name: "Trichter" });
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Tag", "Profilaufrufe", "Quote"]);
    expect(within(table).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["1200", "100 %", "400", "33 %"]);
  });

  it("zeigt bei leeren Daten den Leerzustand", () => {
    render(<BarChart title="Trichter" data={[]} formatValue={String} emptyText="Noch keine Daten für diesen Zeitraum" footnote="Beispielwerte" tableLabels={tableLabels} />);
    expect(screen.getByText("Noch keine Daten für diesen Zeitraum")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("StatFigure", () => {
  it("nennt den Vergleich als Text, das Icon ist nur Begleitung", () => {
    render(<StatFigure label="Profilaufrufe" value="412" comparison={{ text: "+12 % ggü. Vorwoche", direction: "up" }} period="Letzte 7 Tage" />);
    const figure = screen.getByRole("group", { name: "Profilaufrufe" });
    expect(within(figure).getByText("412").className).toContain("tabular");
    const comparison = within(figure).getByText("+12 % ggü. Vorwoche");
    const icon = comparison.parentElement?.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("class")).toContain("text-ink-muted");
    expect(within(figure).getByText("Letzte 7 Tage")).toBeTruthy();
    expect(figure.className).not.toContain("shadow");
  });

  it("kommt ohne Vergleich und Zeitraum aus", () => {
    render(<StatFigure label="Favoriten" value="9" />);
    expect(screen.getByRole("group", { name: "Favoriten" }).querySelector("svg")).toBeNull();
  });
});
