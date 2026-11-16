import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StoryViewer, type StoryPart } from "./story-viewer";
import { useStoryProgress } from "./use-story-progress";

const parts: StoryPart[] = [
  { id: "a", content: <p>Beispielteil eins</p> },
  { id: "b", content: <p>Beispielteil zwei</p>, durationMs: 2000 },
  { id: "c", image: { src: "/beispiel.jpg", alt: "Beispielbeschreibung des Bilds" } },
];

const labels = {
  close: "Story schliessen",
  report: "Story melden",
  previous: "Vorheriger Teil",
  next: "Nächster Teil",
  pause: "Story anhalten",
  resume: "Story fortsetzen",
  position: (current: number, total: number) => `Teil ${current} von ${total}`,
};

function Example({ onReport = () => undefined, onOpenChange }: { onReport?: (part: StoryPart, index: number) => void; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <StoryViewer
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
      title="Story von Beispielname"
      author={{ name: "Beispielname", initials: "BN" }}
      time="vor 2 Stunden"
      exactTime="16.11.2026, 10:00"
      parts={parts}
      labels={labels}
      onReport={onReport}
    />
  );
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function setReducedMotion(reduced: boolean) {
  if (reduced) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
}

describe("StoryViewer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    setReducedMotion(false);
  });

  it("öffnet als Dialog mit Autor, Zeit, Schliessen und «Melden»", () => {
    render(<Example />);
    const dialog = screen.getByRole("dialog", { name: "Story von Beispielname" });
    expect(dialog.textContent).toContain("Beispielname");
    expect(screen.getByText("vor 2 Stunden").getAttribute("title")).toBe("16.11.2026, 10:00");
    expect(screen.getByRole("button", { name: "Story schliessen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Story melden" })).toBeTruthy();
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();
    expect(document.activeElement).toBe(dialog);
  });

  it("läuft nach der Dauer je Teil weiter und schliesst nach dem letzten", () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    advance(4900);
    expect(screen.getByText("Beispielteil eins")).toBeTruthy();
    advance(100);
    expect(screen.getByText("Beispielteil zwei")).toBeTruthy();
    // Der zweite Teil nennt seine eigene Dauer von 2 Sekunden.
    advance(2000);
    expect(screen.getByRole("img", { name: "Beispielbeschreibung des Bilds" })).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    advance(5000);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("blättert mit Pfeil rechts und links", () => {
    render(<Example />);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByText("Beispielteil zwei")).toBeTruthy();
    expect(screen.getByText("Teil 2 von 3")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(screen.getByText("Teil 3 von 3")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(screen.getByText("Beispielteil zwei")).toBeTruthy();
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();
  });

  it("beginnt einen Teil nach dem Blättern von vorn", () => {
    render(<Example />);
    advance(4000);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    advance(1900);
    expect(screen.getByText("Teil 2 von 3")).toBeTruthy();
    advance(100);
    expect(screen.getByText("Teil 3 von 3")).toBeTruthy();
  });

  it("hält mit der Leertaste an und setzt mit ihr fort", () => {
    render(<Example />);
    const dialog = screen.getByRole("dialog");
    advance(3000);
    fireEvent.keyDown(dialog, { key: " " });
    expect(screen.getByRole("button", { name: "Story fortsetzen" })).toBeTruthy();
    advance(20_000);
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();

    fireEvent.keyDown(dialog, { key: " " });
    expect(screen.getByRole("button", { name: "Story anhalten" })).toBeTruthy();
    advance(1900);
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();
    advance(100);
    expect(screen.getByText("Teil 2 von 3")).toBeTruthy();
  });

  it("lässt die Leertaste auf einem Button dessen Aktion", () => {
    render(<Example />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Story melden" }), { key: " " });
    expect(screen.getByRole("button", { name: "Story anhalten" })).toBeTruthy();
  });

  it("pausiert, solange gedrückt gehalten wird", () => {
    render(<Example />);
    const stage = screen.getByText("Beispielteil eins").parentElement as HTMLElement;
    advance(3000);
    fireEvent.pointerDown(stage);
    advance(20_000);
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();
    fireEvent.pointerUp(stage);
    advance(2000);
    expect(screen.getByText("Teil 2 von 3")).toBeTruthy();
  });

  it("zeigt «Melden» bei jedem Teil und meldet den aktuellen", () => {
    const onReport = vi.fn();
    render(<Example onReport={onReport} />);
    const dialog = screen.getByRole("dialog");
    for (let index = 0; index < parts.length; index += 1) {
      const report = screen.getByRole("button", { name: "Story melden" });
      fireEvent.click(report);
      expect(onReport).toHaveBeenLastCalledWith(parts[index], index);
      if (index < parts.length - 1) fireEvent.keyDown(dialog, { key: "ArrowRight" });
    }
    fireEvent.keyDown(dialog, { key: " " });
    expect(screen.getByRole("button", { name: "Story melden" })).toBeTruthy();
  });

  it("schliesst mit Escape", () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("läuft bei reduzierter Bewegung nicht von selbst weiter, lässt sich aber blättern", () => {
    setReducedMotion(true);
    render(<Example />);
    advance(60_000);
    expect(screen.getByText("Teil 1 von 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Story anhalten" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Nächster Teil" }));
    expect(screen.getByText("Teil 2 von 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Story melden" })).toBeTruthy();
  });
});

describe("StoryViewer Fokus", () => {
  it("gibt den Fokus beim Schliessen an das öffnende Element zurück", async () => {
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Beispielstory öffnen
          </button>
          <StoryViewer open={open} onOpenChange={setOpen} title="Story von Beispielname" author={{ name: "Beispielname", initials: "BN" }} time="vor 2 Stunden" exactTime="16.11.2026, 10:00" parts={parts} labels={labels} onReport={() => undefined} />
        </>
      );
    }
    render(<Opener />);
    const opener = screen.getByRole("button", { name: "Beispielstory öffnen" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialog));
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe("useStoryProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("zählt den Fortschritt hoch und meldet das Ende einmal", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useStoryProgress({ count: 2, defaultDuration: 1000, onComplete }));
    expect(result.current).toMatchObject({ index: 0, fraction: 0, paused: false });
    advance(500);
    expect(result.current.fraction).toBeCloseTo(0.5);
    advance(500);
    expect(result.current).toMatchObject({ index: 1, fraction: 0 });
    advance(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    advance(5000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current).toMatchObject({ index: 1, fraction: 1 });
  });

  it("hält während des Haltens an und bleibt an den Rändern", () => {
    const onComplete = vi.fn();
    const { result, rerender } = renderHook(({ holding }: { holding: boolean }) => useStoryProgress({ count: 2, defaultDuration: 1000, holding, onComplete }), { initialProps: { holding: true } });
    advance(3000);
    expect(result.current).toMatchObject({ index: 0, fraction: 0 });
    act(() => result.current.previous());
    expect(result.current.index).toBe(0);
    rerender({ holding: false });
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
    act(() => result.current.next());
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
