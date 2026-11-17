"use client";

import type { ProfileSection } from "@app/core/provider-profile/schemas";
import { Button, InlineAlert, SidePanel, SidePanelContent } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sameValues, toFormValues, type FormValues } from "../../editor-values";
import type { EditorData } from "../../queries/load-editor";
import { SectionForm } from "../editor/section-form";
import { useLeaveGuard } from "../editor/use-leave-guard";
import { useSectionDraft } from "../editor/use-section-draft";

export interface EditPanelProps {
  section: ProfileSection;
  data: Pick<EditorData, "editor" | "regionGroups" | "categories">;
  /** Das Profil ohne `?bearbeiten`; Schliessen führt dorthin zurück. */
  closeHref: string;
}

/**
 * «Bearbeiten am Ort» (PRD v2 6.1 Punkt 3): der Abschnitt als Seitenpanel über
 * dem eigenen Profil, mit eigener URL. Schliessen mit ungespeicherten Eingaben
 * fragt im Panel nach, nicht in einem zweiten Dialog (PRD 13).
 */
export function EditPanel({ section, data, closeHref }: EditPanelProps) {
  const t = useTranslations("profile.editor");
  const router = useRouter();
  const saved = useMemo(() => toFormValues(data.editor.values), [data.editor.values]);
  const [form, setForm] = useState<FormValues>(saved);
  const [confirming, setConfirming] = useState(false);
  const draft = useSectionDraft(data.editor.id, section, saved, form, setForm);
  const dirty = !sameValues(form[section], saved[section]);
  useLeaveGuard(dirty);

  const close = () => router.replace(closeHref, { scroll: false });
  function requestClose() {
    if (dirty) setConfirming(true);
    else close();
  }
  function guard(event: Event) {
    if (!dirty) return;
    event.preventDefault();
    setConfirming(true);
  }

  return (
    <SidePanel open onOpenChange={(open) => (open ? undefined : requestClose())}>
      <SidePanelContent title={t(`section.${section}`)} description={t("panelDescription")} closeLabel={t("closePanel")} onEscapeKeyDown={guard} onInteractOutside={guard}>
        <div className="flex flex-col gap-6">
          {confirming ? (
            <InlineAlert
              tone="warning"
              title={t("unsavedTitle")}
              action={
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      draft.discard();
                      close();
                    }}
                  >
                    {t("discardAndClose")}
                  </Button>
                  <Button variant="quiet" onClick={() => setConfirming(false)}>
                    {t("keepEditing")}
                  </Button>
                </>
              }
            >
              {t("unsavedText")}
            </InlineAlert>
          ) : null}
          {draft.restored && !confirming ? (
            <InlineAlert tone="info" title={t("restored")} action={<Button variant="secondary" onClick={draft.discard}>{t("discard")}</Button>} />
          ) : null}
          <SectionForm
            section={section}
            editor={data.editor}
            form={form}
            saved={saved}
            onChange={setForm}
            onSaved={() => {
              draft.clear();
              close();
            }}
            choices={{ regionGroups: data.regionGroups, categories: data.categories }}
            formId="profil-panel"
            renderActions={(save) =>
              save ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {save}
                  <Button variant="quiet" onClick={requestClose}>
                    {t("cancel")}
                  </Button>
                </div>
              ) : null
            }
          />
        </div>
      </SidePanelContent>
    </SidePanel>
  );
}
