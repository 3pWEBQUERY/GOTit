import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingRegion } from "./loading-region";
import { SkeletonRow } from "./skeleton";

describe("LoadingRegion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function renderRegion() {
    return render(
      <LoadingRegion label="Nachrichten werden geladen" slowFallback={<p>Das dauert länger als üblich.</p>}>
        <div data-testid="skeleton">
          <SkeletonRow />
        </div>
      </LoadingRegion>,
    );
  }

  it("zeigt Skelette erst nach 150 ms", () => {
    const { container } = renderRegion();
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.getByText("Nachrichten werden geladen")).toBeTruthy();
    expect(screen.queryByTestId("skeleton")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(screen.queryByTestId("skeleton")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByTestId("skeleton")).toBeTruthy();
    expect(screen.queryByText("Das dauert länger als üblich.")).toBeNull();
  });

  it("zeigt nach 8 Sekunden den Hinweis mit Ausweg", () => {
    renderRegion();
    act(() => {
      vi.advanceTimersByTime(7999);
    });
    expect(screen.queryByText("Das dauert länger als üblich.")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Das dauert länger als üblich.")).toBeTruthy();
    expect(screen.getByTestId("skeleton")).toBeTruthy();
  });

  it("räumt die Zeitgeber beim Entfernen auf", () => {
    const { unmount } = renderRegion();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
