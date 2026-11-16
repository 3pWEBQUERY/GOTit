import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PageList, pageItems } from "./page-list";
import { Pagination } from "./pagination";

describe("Pagination", () => {
  it("lädt weitere über den Button und nennt den Bereich in einer Live-Region", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(<Pagination loadMoreLabel="Weitere 24 laden" rangeText="1–24 von 48" onLoadMore={onLoadMore} />);
    expect(screen.getByRole("status").textContent).toBe("1–24 von 48");

    const button = screen.getByRole("button", { name: "Weitere 24 laden" });
    await user.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<Pagination loadMoreLabel="Weitere 24 laden" rangeText="1–24 von 48" onLoadMore={onLoadMore} loading />);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await user.click(button);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("ist mit href ein Link auf die nächste Seite", () => {
    render(<Pagination loadMoreLabel="Weitere 24 laden" rangeText="1–24 von 48" href="/suche?seite=2" />);
    expect(screen.getByRole("link", { name: "Weitere 24 laden" }).getAttribute("href")).toBe("/suche?seite=2");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("zeigt am Ende nur noch den Bereich", () => {
    render(<Pagination rangeText="1–48 von 48" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1–48 von 48");
  });
});

describe("PageList", () => {
  const labels = { previous: "Vorherige Seite", next: "Nächste Seite", page: (page: number) => `Seite ${page}` };

  it("kürzt lange Listen und behält erste und letzte Seite", () => {
    expect(pageItems(1, 3)).toEqual([1, 2, 3]);
    expect(pageItems(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageItems(1, 10)).toEqual([1, 2, null, 10]);
  });

  it("ist eine benannte Navigation mit Links und aria-current", () => {
    render(<PageList label="Seiten der Beispieltabelle" page={1} pageCount={10} labels={labels} getHref={(page) => `?seite=${page}`} />);
    const nav = screen.getByRole("navigation", { name: "Seiten der Beispieltabelle" });
    expect(within(nav).getByRole("link", { name: "Seite 1" }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: "Seite 2" }).getAttribute("href")).toBe("?seite=2");
    expect(within(nav).getByRole("link", { name: "Seite 2" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("link", { name: "Nächste Seite" }).getAttribute("href")).toBe("?seite=2");
    const previous = within(nav).getByRole("link", { name: "Vorherige Seite" });
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(previous.hasAttribute("href")).toBe(false);
  });

  it("meldet ohne Adressen den Seitenwechsel über Buttons", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<PageList label="Seiten" page={2} pageCount={3} labels={labels} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "Seite 3" }));
    expect(onPageChange).toHaveBeenLastCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Vorherige Seite" }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });
});
