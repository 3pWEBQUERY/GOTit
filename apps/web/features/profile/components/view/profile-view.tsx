import type { ReactNode } from "react";
import type { ProfileViewModel } from "../../model";
import { nextLevel, type HeadingLevel } from "./heading";
import { LAYOUT, PREVIEW_MOBILE_BAR, type ProfileLayout } from "./layout-classes";
import { ProfileContact, ReportLink } from "./profile-contact";
import { ProfileGallery } from "./profile-gallery";
import { ProfileHeader } from "./profile-header";
import { ProfileSections, type EditLinks } from "./profile-sections";
import { ProfileTrust } from "./profile-trust";

export interface ProfileViewProps {
  model: ProfileViewModel;
  /** Jetzt als ISO-Text, für «Aktualisiert vor …» ohne Abweichung zwischen Server und Browser. */
  now: string;
  layout: ProfileLayout;
  /** Ebene des Namens: 1 auf der Seite, tiefer in einer Vorschau unter einer eigenen Überschrift. */
  nameLevel: HeadingLevel;
  /** Eindeutiger Präfix für Ids, falls die Ansicht mehrfach auf einer Seite steht. */
  idPrefix?: string;
  /** Melden (PRD v2 10.1). Fehlt in der Vorschau. */
  reportHref?: string;
  /** Tab «Medien»; fehlt in der Vorschau. */
  mediaHref?: string;
  /** Tabs über dem Inhalt; nur auf der Seite. */
  tabs?: ReactNode;
  /** Inhalt statt der Übersicht, zum Beispiel der Tab «Medien». */
  children?: ReactNode;
  /** Für den Inhaber: «Bearbeiten» an den Abschnitten. */
  editLinks?: EditLinks;
  /** Ein Hinweis über dem Kopf, zum Beispiel für Mitglieder. */
  notice?: ReactNode;
}

/**
 * Der eine Profil-Renderer (PRD v2 10, 11.2): `/p/[name]`, die Live-Vorschau im
 * Studio und die Vorschau im Onboarding verwenden ihn. Er liest nur das
 * Modell; was öffentlich sein darf, entscheidet vorher der Kern.
 */
export function ProfileView({ model, now, layout, nameLevel, idPrefix = "profil", reportHref, mediaHref, tabs, children, editLinks, notice }: ProfileViewProps) {
  const classes = LAYOUT[layout];
  const sectionLevel = nextLevel(nameLevel);
  return (
    <article data-profile-view className={classes.root}>
      <div className={classes.gallery}>
        <ProfileGallery name={model.displayName} media={model.media} layout={layout} mediaHref={mediaHref} />
      </div>
      <div className={classes.aside}>
        <div className={classes.asideInner}>
          {notice}
          <ProfileHeader model={model} level={nameLevel} editHref={editLinks?.basics} />
          <ProfileTrust model={model} now={now} />
          <ProfileContact contact={model.contact} variant="sticky-panel" reportHref={reportHref} className={classes.panel} />
        </div>
      </div>
      <div className={classes.main}>
        {tabs}
        {children ?? <ProfileSections model={model} level={sectionLevel} idPrefix={idPrefix} editLinks={editLinks} />}
        {reportHref ? <ReportLink href={reportHref} className={classes.bottomReport} /> : null}
      </div>
      {layout === "desktop" ? null : <ProfileContact contact={model.contact} variant="mobile-bar" className={layout === "mobile" ? PREVIEW_MOBILE_BAR : undefined} />}
    </article>
  );
}
