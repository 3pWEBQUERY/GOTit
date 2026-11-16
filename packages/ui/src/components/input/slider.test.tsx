import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Slider } from "./slider";

const chf = (value: number) => `CHF ${value}`;

describe("Slider", () => {
  it("zeigt einen einzelnen Wert als Text und benennt den Griff über das Label", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Slider label="Umkreis" min={5} max={100} step={5} defaultValue={25} formatValue={(value) => `${value} km`} onValueChange={onValueChange} />);
    const thumb = screen.getByRole("slider", { name: "Umkreis" });
    expect(thumb.getAttribute("aria-valuetext")).toBe("25 km");
    expect(screen.getByText("25 km")).toBeTruthy();
    thumb.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith(30);
    expect(screen.getByText("30 km")).toBeTruthy();
  });

  it("bedient einen Bereich mit zwei benannten Griffen", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();
    render(
      <Slider label="Preis" min={0} max={500} step={10} defaultValue={[100, 300]} formatValue={chf} thumbLabels={["Preis von", "Preis bis"]} onValueChange={onValueChange} onValueCommit={onValueCommit} />,
    );
    expect(screen.getByRole("group", { name: "Preis" })).toBeTruthy();
    const from = screen.getByRole("slider", { name: "Preis von" });
    const to = screen.getByRole("slider", { name: "Preis bis" });
    expect(from.getAttribute("aria-valuenow")).toBe("100");
    expect(to.getAttribute("aria-valuenow")).toBe("300");
    expect(to.getAttribute("aria-valuetext")).toBe("CHF 300");
    expect(screen.getByText("CHF 100")).toBeTruthy();
    expect(screen.getByText("CHF 300")).toBeTruthy();

    from.focus();
    await user.keyboard("{ArrowRight}");
    expect(onValueChange).toHaveBeenLastCalledWith([110, 300]);
    expect(onValueCommit).toHaveBeenLastCalledWith([110, 300]);
    to.focus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(onValueChange).toHaveBeenLastCalledWith([110, 280]);
    expect(screen.getByText("CHF 110")).toBeTruthy();
    expect(screen.getByText("CHF 280")).toBeTruthy();
  });

  it("zeigt einen kontrollierten Bereich", () => {
    const { rerender } = render(<Slider label="Preis" min={0} max={500} value={[50, 400]} formatValue={chf} thumbLabels={["Preis von", "Preis bis"]} />);
    expect(screen.getByText("CHF 400")).toBeTruthy();
    rerender(<Slider label="Preis" min={0} max={500} value={[50, 450]} formatValue={chf} thumbLabels={["Preis von", "Preis bis"]} />);
    expect(screen.getByText("CHF 450")).toBeTruthy();
    expect(screen.getByRole("slider", { name: "Preis bis" }).getAttribute("aria-valuenow")).toBe("450");
  });
});

describe("Slider, Typen", () => {
  it("leitet die Form der Callbacks aus dem Wert ab", async () => {
    const user = userEvent.setup();
    const sums: number[] = [];
    const singles: number[] = [];
    render(
      <>
        <Slider label="Preis" min={0} max={500} step={10} defaultValue={[100, 300]} formatValue={chf} thumbLabels={["Preis von", "Preis bis"]} onValueChange={([from, to]) => sums.push(from + to)} />
        <Slider label="Umkreis" min={0} max={50} defaultValue={10} formatValue={String} onValueChange={(value) => singles.push(value + 1)} />
      </>,
    );
    screen.getByRole("slider", { name: "Preis bis" }).focus();
    await user.keyboard("{ArrowRight}");
    screen.getByRole("slider", { name: "Umkreis" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(sums).toEqual([410]);
    expect(singles).toEqual([12]);
  });
});
