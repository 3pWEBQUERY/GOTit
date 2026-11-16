import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../actions/button";
import { ToastProvider, useToast, type ToastOptions } from "./toast";

function Launcher({ options }: { options: ToastOptions }) {
  const { toast } = useToast();
  return <Button onClick={() => toast(options)}>Profil archivieren</Button>;
}

function renderWithProvider(options: ToastOptions) {
  return render(
    <ToastProvider labels={{ close: "Meldung schliessen", region: "Meldungen ({hotkey})" }}>
      <Launcher options={options} />
    </ToastProvider>,
  );
}

describe("Toast", () => {
  it("ruft bei «Rückgängig» den Callback und schliesst", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderWithProvider({ title: "Profil archiviert", tone: "success", action: { label: "Rückgängig machen", onAction } });

    await user.click(screen.getByRole("button", { name: "Profil archivieren" }));
    expect(screen.getByText("Profil archiviert")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Rückgängig machen" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Profil archiviert")).toBeNull();
  });

  it("schliesst über den benannten Schliessen-Button", async () => {
    const user = userEvent.setup();
    renderWithProvider({ title: "Entwurf gespeichert", description: "Beispieltext" });

    await user.click(screen.getByRole("button", { name: "Profil archivieren" }));
    await user.click(screen.getByRole("button", { name: "Meldung schliessen" }));
    expect(screen.queryByText("Entwurf gespeichert")).toBeNull();
  });

  it("bleibt mit Aktion 8 Sekunden, ohne Aktion 5 Sekunden", () => {
    vi.useFakeTimers();
    try {
      const withAction = renderWithProvider({ title: "Mit Aktion", action: { label: "Rückgängig machen", onAction: () => undefined } });
      act(() => screen.getByRole("button", { name: "Profil archivieren" }).click());
      act(() => void vi.advanceTimersByTime(7900));
      expect(screen.queryByText("Mit Aktion")).not.toBeNull();
      act(() => void vi.advanceTimersByTime(200));
      expect(screen.queryByText("Mit Aktion")).toBeNull();
      withAction.unmount();

      renderWithProvider({ title: "Ohne Aktion" });
      act(() => screen.getByRole("button", { name: "Profil archivieren" }).click());
      act(() => void vi.advanceTimersByTime(4900));
      expect(screen.queryByText("Ohne Aktion")).not.toBeNull();
      act(() => void vi.advanceTimersByTime(200));
      expect(screen.queryByText("Ohne Aktion")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("verlangt einen ToastProvider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Launcher options={{ title: "Beispiel" }} />)).toThrow();
    error.mockRestore();
  });
});
