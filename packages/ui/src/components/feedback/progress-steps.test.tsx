import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressSteps } from "./progress-steps";

describe("ProgressSteps", () => {
  it("markiert genau den aktuellen Schritt und nennt jeden Status in Worten", () => {
    render(
      <ProgressSteps
        label="Fortschritt der Profilerstellung"
        summary="Schritt 2 von 3: Fotos"
        labels={{ done: "erledigt", current: "aktueller Schritt", upcoming: "noch offen" }}
        steps={[
          { id: "name", label: "Name", state: "done", href: "/beispiel/name" },
          { id: "fotos", label: "Fotos", state: "current" },
          { id: "tarife", label: "Tarife", state: "upcoming" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Fortschritt der Profilerstellung" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.getAttribute("aria-current"))).toEqual([null, "step", null]);
    expect(items.map((item) => item.textContent)).toEqual(["Nameerledigt", "2Fotosaktueller Schritt", "3Tarifenoch offen"]);
    expect(within(nav).getByRole("link", { name: /Name/ }).getAttribute("href")).toBe("/beispiel/name");
    expect(within(nav).getByText("Schritt 2 von 3: Fotos")).toBeTruthy();
  });
});
