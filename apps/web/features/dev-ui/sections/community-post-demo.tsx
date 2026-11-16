"use client";

import { Button, LoadingRegion, PostCard, PostCardSkeleton, PostComposer, useToast } from "@app/ui";
import { useState } from "react";
import { CommunityDemoBlock, InitialsSurface } from "./community-demo-block";

const postLabels = { comments: "3 Kommentare", save: "Beitrag speichern", menu: "Weitere Aktionen zum Beitrag", report: "Beitrag melden" };
const author = { name: "Beispielname", href: "#beispielprofil", initials: "BN" };
const countLabel = (used: number, max: number) => `${used} von ${max} Zeichen`;

/** PostCard und PostComposer der Testseite «Community». */
export function CommunityPostDemo() {
  return (
    <>
      <PostCardDemo />
      <PostComposerDemo />
    </>
  );
}

function PostCardDemo() {
  const { toast } = useToast();
  const [saved, setSaved] = useState<Record<string, boolean>>({ gespeichert: true });
  const bind = (id: string) => ({
    labels: postLabels,
    saved: Boolean(saved[id]),
    onSavedChange: (next: boolean) => setSaved((current) => ({ ...current, [id]: next })),
    onReport: () => toast({ title: "Meldung geöffnet", description: "In der App öffnet sich hier der Dialog zum Melden." }),
  });

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">PostCard</h2>
      <CommunityDemoBlock title="Nur Text">
        <PostCard author={author} time="vor 3 Stunden" exactTime="16.11.2026, 09:12" dateTime="2026-11-16T09:12" region="Beispielstadt" {...bind("text")}>
          Beispieltext eines Beitrags. Er steht hier, um Zeilenlänge und Abstände zu zeigen, und sagt sonst nichts aus.
        </PostCard>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Mit Bild 16:9, gespeichert">
        <PostCard
          author={author}
          time="gestern"
          exactTime="15.11.2026, 18:40"
          dateTime="2026-11-15T18:40"
          region="Beispielregion"
          imageSlot={<InitialsSurface initials="BN" label="Beispielbild: neutrale Fläche mit Initialen" />}
          commentsHref="#beispielbeitrag"
          {...bind("gespeichert")}
          labels={{ ...postLabels, comments: "12 Kommentare" }}
        >
          Beispieltext eines Beitrags mit einem Bild im Querformat.
        </PostCard>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Mit Bild 4:5">
        <PostCard author={{ ...author, name: "Beispielstudio", initials: "BS" }} time="vor 2 Tagen" exactTime="14.11.2026, 11:05" region="Beispielstadt" imageSlot={<InitialsSurface initials="BS" label="Beispielbild im Hochformat: neutrale Fläche mit Initialen" />} imageRatio="4:5" {...bind("hoch")} labels={{ ...postLabels, comments: "Keine Kommentare" }}>
          Beispieltext eines Beitrags mit einem Bild im Hochformat.
        </PostCard>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Bezahlter Beitrag, beschriftet">
        <PostCard author={{ ...author, name: "Beispielanbieter", initials: "BA" }} time="vor 1 Stunde" exactTime="16.11.2026, 11:20" region="Beispielstadt" sponsoredLabel="Anzeige" {...bind("anzeige")} labels={{ ...postLabels, comments: "1 Kommentar" }}>
          Beispieltext einer Anzeige. Sie sieht aus wie ein Beitrag und trägt das Wort «Anzeige».
        </PostCard>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Eigener Beitrag in Prüfung">
        <PostCard author={{ ...author, name: "Beispielname (du)" }} time="gerade eben" exactTime="16.11.2026, 12:30" moderation={{ label: "In Prüfung" }} {...bind("pruefung")} labels={{ ...postLabels, comments: "Keine Kommentare" }}>
          Beispieltext eines Beitrags, den vorerst nur du siehst.
        </PostCard>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Zwei Beiträge untereinander, getrennt durch eine Linie">
        <div>
          <PostCard author={author} time="vor 4 Stunden" exactTime="16.11.2026, 08:10" region="Beispielstadt" {...bind("liste-1")}>
            Erster Beispieltext eines Beitrags.
          </PostCard>
          <PostCard author={{ ...author, name: "Beispielname B", initials: "BB" }} time="vor 5 Stunden" exactTime="16.11.2026, 07:02" region="Beispielregion" {...bind("liste-2")}>
            Zweiter Beispieltext eines Beitrags.
          </PostCard>
        </div>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Lädt (PostCardSkeleton)">
        <LoadingRegion label="Beiträge werden geladen" delayMs={0}>
          <PostCardSkeleton />
          <PostCardSkeleton withImage />
        </LoadingRegion>
      </CommunityDemoBlock>
    </section>
  );
}

function PostComposerDemo() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [compactText, setCompactText] = useState("");
  const [attached, setAttached] = useState(false);
  const [withImage, setWithImage] = useState("Beispieltext eines Beitrags mit angehängtem Bild.");

  const submit = () => {
    if (text.trim() === "") {
      setError("Schreib zuerst einen Text, dann kannst du den Beitrag senden.");
      return;
    }
    setError(null);
    setText("");
    toast({ title: "Beitrag gesendet", description: "Er wird geprüft und erscheint danach im Feed." });
  };

  const labels = { field: "Dein Beitrag", submit: "Beitrag senden", attach: "Bild anhängen", open: "Beitrag schreiben …", collapse: "Entwurf einklappen" };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">PostComposer</h2>
      <CommunityDemoBlock title="Ruhe, mit Zeichenzähler und Hinweis">
        <PostComposer
          value={text}
          onValueChange={(next) => {
            setText(next);
            setError(null);
          }}
          onSubmit={submit}
          labels={labels}
          error={error}
          maxLength={500}
          countLabel={countLabel}
          notice="Dein Beitrag wird vor der Veröffentlichung geprüft."
          onAttach={() => undefined}
        />
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Kompakter Einstieg, klappt auf">
        <PostComposer value={compactText} onValueChange={setCompactText} onSubmit={() => setCompactText("")} labels={labels} compact maxLength={500} countLabel={countLabel} notice="Dein Beitrag wird vor der Veröffentlichung geprüft." />
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Mit Vorschau eines angehängten Bilds">
        <PostComposer
          value={withImage}
          onValueChange={setWithImage}
          onSubmit={() => undefined}
          labels={labels}
          maxLength={500}
          countLabel={countLabel}
          onAttach={() => setAttached(true)}
          preview={
            attached ? (
              <div className="flex items-center gap-3">
                <div className="aspect-video w-24 overflow-hidden rounded-control">
                  <InitialsSurface initials="BN" label="Vorschau: neutrale Fläche mit Initialen" />
                </div>
                <Button variant="quiet" onClick={() => setAttached(false)}>
                  Bild entfernen
                </Button>
              </div>
            ) : null
          }
        />
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Fehler am Feld">
        <PostComposer value="" onValueChange={() => undefined} onSubmit={() => undefined} labels={labels} error="Schreib zuerst einen Text, dann kannst du den Beitrag senden." />
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Wird gesendet">
        <PostComposer value="Beispieltext eines Beitrags, der gerade gesendet wird." onValueChange={() => undefined} onSubmit={() => undefined} labels={labels} pending />
      </CommunityDemoBlock>
    </section>
  );
}
