"use client";

import { CRITICAL_FIELDS, PROFILE_SECTIONS, SECTION_CRITICAL_FIELDS, type ProfileSection } from "@app/core/provider-profile/schemas";
import { Button, InlineAlert, Sheet, SheetContent, UiLink } from "@app/ui";
import { ChevronLeft, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { applyDraft } from "../../apply-draft";
import { sameValues, toFormValues, type FormValues } from "../../editor-values";
import type { EditorData } from "../../queries/load-editor";
import { TopBarTitle } from "../../../shell/components/top-bar-title";
import { LeaveDialog } from "./leave-dialog";
import { ProfileView } from "../view/profile-view";
import { LivePreview } from "./live-preview";
import { SectionForm } from "./section-form";
import { SectionList } from "./section-list";
import { useLeaveGuard } from "./use-leave-guard";
import { useSectionDraft } from "./use-section-draft";

export interface ProfileEditorProps {
  section: ProfileSection | null;
  data: Pick<EditorData, "editor" | "base" | "regionGroups" | "regionLinks" | "categories">;
  links: { sections: Record<ProfileSection, string>; list: string; marketplace: string };
  statusLabel: string;
  now: string;
}

/**
 * «Mein Profil» im Studio (PRD v2 11.2). Desktop: Abschnittsliste mit Stand und
 * Formular, daneben die Live-Vorschau. Mobile: die Liste als erste Ebene, das
 * Formular als zweite, die Vorschau über einen eigenen Button.
 */
export function ProfileEditor({ section, data, links, statusLabel, now }: ProfileEditorProps) {
  const t = useTranslations("profile.editor");
  const { editor } = data;
  const saved = useMemo(() => toFormValues(editor.values), [editor.values]);
  const [form, setForm] = useState<FormValues>(saved);
  // Nach dem Speichern kommt der neue Stand vom Server; das Formular übernimmt ihn (zum Beispiel neue Preis-IDs).
  const [savedSeen, setSavedSeen] = useState(saved);
  if (savedSeen !== saved) {
    setSavedSeen(saved);
    setForm(saved);
  }
  const [previewOpen, setPreviewOpen] = useState(false);
  const active = section ?? "basics";
  const draft = useSectionDraft(editor.id, active, saved, form, setForm);
  const dirty = section !== null && !sameValues(form[active], saved[active]);
  const guard = useLeaveGuard(dirty);
  const preview = applyDraft(data.base, form, { regionLinks: data.regionLinks, categories: data.categories, now });
  const pendingSections = PROFILE_SECTIONS.filter((entry) => SECTION_CRITICAL_FIELDS[entry].some((field) => editor.pending?.[field] !== undefined));
  const choices = { regionGroups: data.regionGroups, categories: data.categories };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <TopBarTitle title={section ? t(`section.${section}`) : t("title")} />
      <div className="flex min-w-0 flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-small text-ink-muted">{statusLabel}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <UiLink href={links.marketplace} className="inline-flex min-h-11 items-center text-body text-ink underline underline-offset-4 hover:text-accent">
              {t("viewInMarketplace")}
            </UiLink>
            <Button variant="secondary" icon={<Eye aria-hidden strokeWidth={1.5} />} className="lg:hidden" onClick={() => setPreviewOpen(true)}>
              {t("preview.open")}
            </Button>
          </div>
        </header>
        {editor.rejectedChange ? (
          <InlineAlert tone="warning" title={t("rejectedTitle")}>
            {editor.rejectedChange.reason}
          </InlineAlert>
        ) : null}
        {editor.pending && CRITICAL_FIELDS.some((field) => editor.pending?.[field] !== undefined) && !section ? <InlineAlert tone="info" title={t("pendingTitle")}>{t("pendingText")}</InlineAlert> : null}
        <SectionList statuses={editor.sections} links={links.sections} current={section} pending={pendingSections} className={section ? "hidden lg:block" : undefined} />
        {section ? (
          <section aria-labelledby="abschnitt-titel" className="flex flex-col gap-4">
            <UiLink href={links.list} className="inline-flex min-h-11 items-center gap-1 self-start text-small text-ink underline underline-offset-4 hover:text-accent lg:hidden">
              <ChevronLeft aria-hidden strokeWidth={1.5} className="size-4" />
              {t("backToSections")}
            </UiLink>
            <h2 id="abschnitt-titel" className="text-h2">
              {t(`section.${section}`)}
            </h2>
            {draft.restored ? (
              <InlineAlert
                tone="info"
                title={t("restored")}
                action={
                  <Button variant="secondary" onClick={draft.discard}>
                    {t("discard")}
                  </Button>
                }
              />
            ) : null}
            <SectionForm section={section} editor={editor} form={form} saved={saved} onChange={setForm} onSaved={draft.clear} choices={choices} formId="profil-abschnitt" />
          </section>
        ) : (
          <p className="hidden text-body text-ink-muted lg:block">{t("chooseSection")}</p>
        )}
      </div>
      <section aria-labelledby="vorschau-titel" className="hidden min-w-0 flex-col gap-3 lg:flex">
        <h2 id="vorschau-titel" className="text-h2">
          {t("preview.title")}
        </h2>
        <LivePreview model={preview} now={now} idPrefix="vorschau" />
      </section>
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent title={t("preview.title")} closeLabel={t("preview.close")} handleLabel={t("preview.handle")} defaultDetent="full">
          <div className="pb-4">
            <ProfileView model={preview} now={now} layout="mobile" nameLevel={3} idPrefix="vorschau-mobil" />
          </div>
        </SheetContent>
      </Sheet>
      <LeaveDialog target={guard.target} onCancel={guard.cancel} />
    </div>
  );
}
