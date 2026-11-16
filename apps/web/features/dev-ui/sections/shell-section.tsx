"use client";

import { AgeGate, AppHeader, Breadcrumbs, Button, Footer, GlassTabBar, GlassTopBar, IconButton, MegaMenu, ModeSwitch, SkipLink, StudioSidebar } from "@app/ui";
import { Bell, CalendarDays, ChevronLeft, Compass, Heart, Menu, MessageSquare, Search, Sun, UserRound } from "lucide-react";
import { useState } from "react";

const columns = [
  { heading: "Regionen", links: [{ label: "Beispielstadt A", href: "#a" }, { label: "Beispielstadt B", href: "#b" }], more: { label: "Alle Kantone", href: "#alle" } },
  { heading: "Jetzt", links: [{ label: "Heute verfügbar", href: "#heute" }, { label: "Neu dabei", href: "#neu" }] },
  { heading: "Für dich", links: [], note: "Mit einem Konto speicherst du Suchen und Favoriten." },
];

const sidebarItems = [
  { href: "#heute", label: "Heute", icon: <Sun strokeWidth={1.5} />, current: true },
  { href: "#nachrichten", label: "Nachrichten", icon: <MessageSquare strokeWidth={1.5} />, badge: 3 },
  { href: "#kalender", label: "Kalender", icon: <CalendarDays strokeWidth={1.5} /> },
];

const tabs = [
  { key: "a", label: "Entdecken", href: "#entdecken", icon: <Compass strokeWidth={1.5} />, current: true },
  { key: "b", label: "Nachrichten", href: "#nachrichten", icon: <MessageSquare strokeWidth={1.5} />, badge: 2 },
  { key: "c", label: "Favoriten", href: "#favoriten", icon: <Heart strokeWidth={1.5} /> },
  { key: "d", label: "Ich", href: "#ich", icon: <UserRound strokeWidth={1.5} /> },
];

/** Testseite der Gruppe Shell. Kopfzeile, Seitenleiste und Glas-Leisten erscheinen je nach Breite. */
export function ShellSection() {
  const [collapsed, setCollapsed] = useState(false);
  const [studio, setStudio] = useState(false);
  const modeSwitch = (
    <ModeSwitch
      label="Bereich wechseln"
      onSegmentClick={(key, event) => {
        event.preventDefault();
        setStudio(key === "studio");
      }}
      segments={[
        { key: "marketplace", label: "Marktplatz", href: "#marktplatz", current: !studio },
        { key: "studio", label: "Studio", href: "#studio", current: studio },
      ]}
    />
  );
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">SkipLink</h2>
        <p className="text-small text-ink-muted">Erscheint beim ersten Tab-Druck oben links.</p>
        <SkipLink href="#inhalt">Zum Inhalt springen</SkipLink>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">AppHeader mit ModeSwitch und MegaMenu (ab 768 px)</h2>
        <AppHeader
          logo={<span className="text-h3">Beispiel</span>}
          modeSwitch={modeSwitch}
          navigationLabel="Beispielnavigation"
          navigation={<MegaMenu label="Entdecken" columns={columns} />}
          navigationTrigger={<IconButton label="Navigation öffnen" icon={<Menu strokeWidth={1.5} />} />}
          search={<span className="text-small text-ink-muted">Suchfeld</span>}
          searchTrigger={<IconButton label="Suche" icon={<Search strokeWidth={1.5} />} />}
          actions={<IconButton label="Benachrichtigungen" badge={4} icon={<Bell strokeWidth={1.5} />} />}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">ModeSwitch</h2>
        {modeSwitch}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Breadcrumbs (ab 768 px)</h2>
        <Breadcrumbs label="Pfad" items={[{ label: "Entdecken", href: "#entdecken" }, { label: "Beispielstadt", href: "#stadt" }, { label: "Beispielname" }]} />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">StudioSidebar (ab 768 px)</h2>
        <div className="flex">
          <StudioSidebar
            label="Beispiel-Studio"
            items={sidebarItems}
            secondaryItems={[]}
            status={<p className="px-1 text-small">Profil: Online</p>}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            labels={{ collapse: "Seitenleiste einklappen", expand: "Seitenleiste ausklappen" }}
          />
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">AgeGate</h2>
        <AgeGate titleAs="h3" title="Bist du mindestens 18 Jahre alt?" description="Beispieltext der Altersprüfung." points={["Erster Hinweis", "Zweiter Hinweis"]}>
          <Button variant="primary">Alter bestätigen</Button>
        </AgeGate>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Footer</h2>
        <Footer
          label="Beispiel-Fusszeile"
          legalNote="Beispielhinweis"
          controls={<p className="text-small text-ink-muted">Sprache und Darstellung</p>}
          groups={[{ heading: "Hilfe", links: [{ label: "Hilfe und Antworten", href: "#hilfe" }] }]}
        />
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-h2">GlassTopBar und GlassTabBar (unter 768 px)</h2>
        <p className="text-small text-ink-muted">Beide Leisten schweben auf schmalen Bildschirmen über dieser Seite.</p>
        <GlassTopBar title="Beispieltitel" back={<IconButton label="Zurück" icon={<ChevronLeft strokeWidth={1.5} />} />} />
        <GlassTabBar label="Beispielbereiche" items={tabs} mode="demo" />
      </section>
    </div>
  );
}
