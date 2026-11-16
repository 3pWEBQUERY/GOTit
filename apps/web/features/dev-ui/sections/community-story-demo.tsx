"use client";

import { Button, StoryRing, StoryRingRow, StoryViewer, type StoryPart } from "@app/ui";
import { useState } from "react";
import { CommunityDemoBlock } from "./community-demo-block";

const stories = [
  { id: "a", name: "Beispielname A", initials: "BA" },
  { id: "b", name: "Beispielname B", initials: "BB" },
  { id: "c", name: "Beispielstudio mit langem Namen", initials: "BS" },
  { id: "d", name: "Beispielname D", initials: "BD" },
  { id: "e", name: "Beispielname E", initials: "BE" },
  { id: "f", name: "Beispielname F", initials: "BF" },
];

function StoryText({ children }: { children: string }) {
  return <p className="max-w-prose p-6 text-center text-h2 text-ink">{children}</p>;
}

const parts: StoryPart[] = [
  { id: "1", content: <StoryText>Beispieltext des ersten Teils einer Story</StoryText> },
  { id: "2", content: <StoryText>Zweiter Teil, er dauert nur drei Sekunden</StoryText>, durationMs: 3000 },
  { id: "3", content: <StoryText>Dritter und letzter Teil der Beispielstory</StoryText> },
];

const viewerLabels = {
  close: "Story schliessen",
  report: "Story melden",
  previous: "Vorherigen Teil anzeigen",
  next: "Nächsten Teil anzeigen",
  pause: "Story anhalten",
  resume: "Story fortsetzen",
  position: (current: number, total: number) => `Teil ${current} von ${total}`,
};

/** StoryRing, StoryRingRow und StoryViewer der Testseite «Community». */
export function CommunityStoryDemo() {
  const [seen, setSeen] = useState<Record<string, boolean>>({ d: true, e: true, f: true });
  const [openId, setOpenId] = useState<string | null>(null);
  const [reported, setReported] = useState<string | null>(null);
  const current = stories.find((story) => story.id === openId) ?? null;
  const [lastOpened, setLastOpened] = useState(stories[0]);
  const shown = current ?? lastOpened;

  const openStory = (id: string) => {
    setLastOpened(stories.find((story) => story.id === id) ?? stories[0]);
    setOpenId(id);
    setSeen((value) => ({ ...value, [id]: true }));
  };

  return (
    <>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">StoryRing</h2>
        <CommunityDemoBlock title="Ungesehen und gesehen, als Button">
          <div className="flex gap-2">
            <StoryRing name="Beispielname" initials="BN" stateLabel="neu" onSelect={() => undefined} />
            <StoryRing name="Beispielname" initials="BN" seen stateLabel="gesehen" onSelect={() => undefined} />
          </div>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="Als Link, langer Name auf einer Zeile">
          <div className="flex gap-2">
            <StoryRing name="Beispielstudio mit langem Namen" initials="BS" stateLabel="neu" href="#beispielstory" />
          </div>
        </CommunityDemoBlock>
        <CommunityDemoBlock title="StoryRingRow: scrollbare Reihe, öffnet den Viewer">
          <StoryRingRow label="Stories">
            {stories.map((story) => (
              <StoryRing key={story.id} name={story.name} initials={story.initials} seen={Boolean(seen[story.id])} stateLabel={seen[story.id] ? "gesehen" : "neu"} onSelect={() => openStory(story.id)} />
            ))}
          </StoryRingRow>
        </CommunityDemoBlock>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="text-h2">StoryViewer</h2>
        <CommunityDemoBlock title="Vollbild mit drei Teilen">
          <p className="text-small text-ink-muted">Pfeil links und rechts blättern, die Leertaste hält an, Escape schliesst. Halten pausiert. Bei reduzierter Bewegung läuft nichts von selbst weiter.</p>
          <div>
            <Button variant="secondary" onClick={() => openStory("a")}>
              Beispielstory öffnen
            </Button>
          </div>
          <p role="status" className="text-small text-ink-muted">
            {reported ?? "Noch nichts gemeldet"}
          </p>
        </CommunityDemoBlock>
        {shown ? (
          <StoryViewer
            open={current !== null}
            onOpenChange={(open) => (open ? undefined : setOpenId(null))}
            title={`Story von ${shown.name}`}
            author={{ name: shown.name, initials: shown.initials, href: "#beispielprofil" }}
            time="vor 2 Stunden"
            exactTime="16.11.2026, 10:00"
            dateTime="2026-11-16T10:00"
            parts={parts}
            labels={viewerLabels}
            onReport={(_part, index) => setReported(`Gemeldet: Teil ${index + 1} der Story von ${shown.name}`)}
          />
        ) : null}
      </section>
    </>
  );
}
