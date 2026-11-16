import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "./event-card";
import { FollowButton } from "./follow-button";
import { PostCard, type PostCardProps } from "./post-card";
import { PostComposer } from "./post-composer";
import { StoryRing, StoryRingRow } from "./story-ring";
import { TourCard } from "./tour-card";

const labels = { comments: "3 Kommentare", save: "Speichern", menu: "Weitere Aktionen", report: "Beitrag melden" };

function Post(props: Partial<PostCardProps>) {
  const [saved, setSaved] = useState(false);
  return (
    <PostCard
      author={{ name: "Beispielname", href: "/profil/beispielname", initials: "BN" }}
      time="vor 3 Stunden"
      exactTime="16.11.2026, 09:12"
      region="Beispielstadt"
      labels={labels}
      saved={saved}
      onSavedChange={setSaved}
      onReport={() => undefined}
      {...props}
    >
      Beispieltext eines Beitrags
    </PostCard>
  );
}

describe("PostCard", () => {
  it("zeigt Autor als Link, Zeit mit genauem Datum, Region und Text", () => {
    render(<Post />);
    const article = screen.getByRole("article");
    expect(within(article).getByRole("link", { name: "Beispielname" }).getAttribute("href")).toBe("/profil/beispielname");
    expect(within(article).getByText("vor 3 Stunden").getAttribute("title")).toBe("16.11.2026, 09:12");
    expect(within(article).getByText("Beispielstadt")).toBeTruthy();
    expect(within(article).getByText("Beispieltext eines Beitrags")).toBeTruthy();
  });

  it("hat keinen Like-Zähler: die einzigen Aktionen sind Kommentare, Speichern und das Menü", () => {
    render(<Post />);
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
    expect(names).toEqual(["Weitere Aktionen", "3 Kommentare", "Speichern"]);
    expect(screen.getByRole("article").textContent).not.toMatch(/gefällt|like|herz/i);
    // Die einzige Zahl der Karte ist die Anzahl Kommentare als Text.
    expect(screen.getByRole("contentinfo").textContent?.match(/\d+/g)).toEqual(["3"]);
  });

  it("zeigt «Anzeige» und den Moderationsstatus nur, wenn sie gesetzt sind", () => {
    const { rerender } = render(<Post />);
    expect(screen.queryByText("Anzeige")).toBeNull();
    expect(screen.queryByText("In Prüfung")).toBeNull();
    rerender(<Post sponsoredLabel="Anzeige" moderation={{ label: "In Prüfung" }} />);
    expect(screen.getByText("Anzeige")).toBeTruthy();
    expect(screen.getByText("In Prüfung")).toBeTruthy();
    // «Anzeige» ist neutral beschriftet, nicht in einer Statusfarbe.
    expect(screen.getByText("Anzeige").className).not.toMatch(/success|accent|error|warning/);
  });

  it("schaltet Speichern mit aria-pressed um und behält den Namen", async () => {
    const user = userEvent.setup();
    render(<Post />);
    const save = screen.getByRole("button", { name: "Speichern" });
    expect(save.getAttribute("aria-pressed")).toBe("false");
    await user.click(save);
    expect(screen.getByRole("button", { name: "Speichern" }).getAttribute("aria-pressed")).toBe("true");
    save.focus();
    await user.keyboard("{Enter}");
    expect(save.getAttribute("aria-pressed")).toBe("false");
  });

  it("bietet «Melden» im Menü an", async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    render(<Post onReport={onReport} />);
    await user.click(screen.getByRole("button", { name: "Weitere Aktionen" }));
    await user.click(screen.getByRole("menuitem", { name: "Beitrag melden" }));
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("zeigt höchstens ein Bild mit Alternativtext und verlinkt die Kommentare", () => {
    render(<Post image={{ src: "/beispiel.jpg", alt: "Beispielbeschreibung des Bilds", ratio: "4:5" }} commentsHref="/community/beitrag/1" />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "Beispielbeschreibung des Bilds" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "3 Kommentare" }).getAttribute("href")).toBe("/community/beitrag/1");
  });
});

describe("FollowButton", () => {
  const followLabels = { follow: "Folgen", following: "Gefolgt" };

  function Example({ onChange }: { onChange?: (following: boolean) => void }) {
    const [following, setFollowing] = useState(false);
    return (
      <FollowButton
        following={following}
        labels={followLabels}
        onFollowingChange={(next) => {
          setFollowing(next);
          onChange?.(next);
        }}
      />
    );
  }

  it("wechselt zwischen «Folgen» und «Gefolgt» mit aria-pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Folgen" });
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await user.click(button);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: "Gefolgt" }).getAttribute("aria-pressed")).toBe("true");
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Folgen" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("löst im Zustand «wird gespeichert» nichts aus und zeigt keinen Zähler", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FollowButton following pending labels={followLabels} onFollowingChange={onChange} />);
    const button = screen.getByRole("button", { name: "Gefolgt" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await user.click(button);
    expect(onChange).not.toHaveBeenCalled();
    expect(button.textContent).not.toMatch(/\d/);
  });
});

describe("PostComposer", () => {
  const composerLabels = { field: "Dein Beitrag", submit: "Beitrag senden", attach: "Bild anhängen", open: "Beitrag schreiben …", collapse: "Entwurf schliessen" };

  function Example({ onSubmit, compact, error }: { onSubmit: () => void; compact?: boolean; error?: string }) {
    const [value, setValue] = useState("");
    return (
      <PostComposer
        value={value}
        onValueChange={setValue}
        onSubmit={onSubmit}
        labels={composerLabels}
        compact={compact}
        error={error}
        maxLength={500}
        countLabel={(used, max) => `${used} von ${max} Zeichen`}
        notice="Wird vor der Veröffentlichung geprüft"
        onAttach={() => undefined}
      />
    );
  }

  it("zählt Zeichen, zeigt den Hinweis und sendet", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Example onSubmit={onSubmit} />);
    expect(screen.getByText("0 von 500 Zeichen")).toBeTruthy();
    await user.type(screen.getByLabelText("Dein Beitrag"), "Beispieltext");
    expect(screen.getByText("12 von 500 Zeichen")).toBeTruthy();
    expect(screen.getByText("Wird vor der Veröffentlichung geprüft")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bild anhängen" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Beitrag senden" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("zeigt den Fehler am Feld und lässt den Senden-Button aktiv", () => {
    render(<Example onSubmit={() => undefined} error="Schreib mindestens einen Satz." />);
    expect(screen.getByLabelText("Dein Beitrag").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Schreib mindestens einen Satz.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Beitrag senden" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("klappt die kompakte Variante auf, setzt den Fokus ins Feld und klappt wieder zu", async () => {
    const user = userEvent.setup();
    render(<Example onSubmit={() => undefined} compact />);
    expect(screen.queryByLabelText("Dein Beitrag")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Beitrag schreiben …" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Dein Beitrag"));
    await user.click(screen.getByRole("button", { name: "Entwurf schliessen" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Beitrag schreiben …" }));
  });
});

describe("StoryRing", () => {
  it("nennt den Zustand als Wort und unterscheidet Link und Button", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <StoryRingRow label="Stories">
        <StoryRing name="Beispielname A" initials="BA" stateLabel="neu" onSelect={onSelect} />
        <StoryRing name="Beispielname B" initials="BB" seen stateLabel="gesehen" href="/community/story/b" />
      </StoryRingRow>,
    );
    const list = screen.getByRole("list", { name: "Stories" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    const button = within(list).getByRole("button", { name: /Beispielname A.*neu/ });
    expect(button.getAttribute("data-seen")).toBe("false");
    await user.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const link = within(list).getByRole("link", { name: /Beispielname B.*gesehen/ });
    expect(link.getAttribute("href")).toBe("/community/story/b");
    expect(link.getAttribute("data-seen")).toBe("true");
  });
});

describe("EventCard und TourCard", () => {
  it("zeigt das Datum der Veranstaltung als Text mit maschinenlesbarem Wert", () => {
    render(<EventCard day="21" month="Nov." dateTime="2026-11-21T19:00" dateLabel="Samstag, 21. November 2026, 19:00" title="Beispielveranstaltung" href="/community/veranstaltungen/1" location="Beispielort, Beispielstadt" organizer="Veranstaltet von Beispielstudio" />);
    const time = screen.getByText("Samstag, 21. November 2026, 19:00").closest("time");
    expect(time?.getAttribute("datetime")).toBe("2026-11-21T19:00");
    expect(time?.textContent).toContain("21");
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Beispielveranstaltung");
    expect(screen.getByRole("link", { name: "Beispielveranstaltung" }).getAttribute("href")).toBe("/community/veranstaltungen/1");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("verlinkt die Tour zum Profil und nennt Region und Zeitraum", () => {
    render(<TourCard name="Beispielname" href="/profil/beispielname" regions="Beispielstadt" period="12.–14. Nov." initials="BN" />);
    expect(screen.getByRole("link", { name: "Beispielname" }).getAttribute("href")).toBe("/profil/beispielname");
    expect(screen.getByText("Beispielstadt").parentElement?.textContent).toBe("Beispielstadt, 12.–14. Nov.");
  });
});
