"use client";

import {
  Button,
  InlineAlert,
  SidePanel,
  SidePanelContent,
  Skeleton,
  UiLink,
  useToast,
} from "@app/ui";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { removeBlockAction } from "../actions/calendar";
import type { BlockView } from "../queries/load-calendar";
import type { RequestView } from "../queries/request-view";
import { RequestDetail } from "../request/request-detail";

/** Ersetzt den Platzhalter `__id__` einer fertig übersetzten URL. */
export function withId(template: string, id: string): string {
  return template.replace("__id__", encodeURIComponent(id));
}

export interface PanelLinks {
  /** `/studio/nachrichten/__id__` in der Sprache der Seite. */
  conversation: string;
  /** `/studio/anfragen/__id__` in der Sprache der Seite. */
  request: string;
}

/**
 * Seitenpanel einer Anfrage im Kalender (PRD 11.5, 8): Detail, Verlauf,
 * Unterhaltung und Aktionen, dieselben wie auf `/studio/anfragen/[id]`.
 * Während die Daten laden, steht ein Skelett; fehlt die Anfrage, ein Satz.
 */
export function RequestPanel({
  open,
  loading,
  request,
  links,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  request: RequestView | null;
  links: PanelLinks;
  onClose: () => void;
}) {
  const t = useTranslations("bookingStudio");
  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
    >
      <SidePanelContent
        title={
          request
            ? t("request.title", { name: request.memberName })
            : t("meta.request")
        }
        closeLabel={t("calendar.close")}
        data-request-panel
      >
        {request ? (
          <div className="flex flex-col gap-6">
            <RequestDetail
              request={request}
              headingLevel={3}
              conversationHref={withId(
                links.conversation,
                request.conversationId,
              )}
              report={{
                mode: "link",
                href: `${withId(links.request, request.id)}?melden=1`,
              }}
            />
            <UiLink
              href={withId(links.request, request.id)}
              className="self-start text-small text-ink underline underline-offset-4"
            >
              {t("calendar.openPage")}
            </UiLink>
          </div>
        ) : loading ? (
          <div
            role="status"
            aria-label={t("calendar.panelLoading")}
            className="flex flex-col gap-4"
          >
            <Skeleton lines={4} />
            <Skeleton variant="block" className="h-11 w-2/3 rounded-control" />
          </div>
        ) : (
          <p className="text-body text-ink-muted">
            {t("calendar.panelMissing")}
          </p>
        )}
      </SidePanelContent>
    </SidePanel>
  );
}

/** Seitenpanel eines Blockers oder einer Abwesenheit, mit Entfernen nach Rückfrage am Ort. */
export function BlockPanel({
  open,
  loading,
  block,
  onClose,
  onRemoved,
}: {
  open: boolean;
  loading: boolean;
  block: BlockView | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const t = useTranslations("bookingStudio.block");
  const tc = useTranslations("bookingStudio.calendar");
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const stepId = useId();
  const absence = block?.kind === "ABSENCE";

  useEffect(() => {
    if (confirming) stepHeading.current?.focus();
  }, [confirming]);

  async function remove() {
    if (!block) return;
    setPending(true);
    setFailed(false);
    const result = await removeBlockAction(block.id).catch(() => ({
      ok: false,
    }));
    setPending(false);
    if (!result.ok) {
      setFailed(true);
      return;
    }
    toast({ title: t("removed"), tone: "success" });
    setConfirming(false);
    onRemoved();
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (next || pending) return;
        setConfirming(false);
        onClose();
      }}
    >
      <SidePanelContent
        title={absence ? t("panelTitleAbsence") : t("panelTitle")}
        closeLabel={tc("close")}
        data-block-panel
      >
        {block ? (
          <div className="flex flex-col gap-6">
            <dl className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("when")}</dt>
                <dd className="tabular text-body text-ink">{block.when}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-label text-ink-muted">{t("note")}</dt>
                <dd className="text-body break-words whitespace-pre-line text-ink">
                  {block.note ?? (
                    <span className="text-ink-muted">{t("noNote")}</span>
                  )}
                </dd>
              </div>
            </dl>
            {failed ? (
              <InlineAlert tone="error" title={t("removeFailed")} />
            ) : null}
            {confirming ? (
              <div
                role="group"
                aria-labelledby={stepId}
                className="flex flex-col gap-3 rounded-card border border-border-strong p-4"
              >
                <h3
                  id={stepId}
                  ref={stepHeading}
                  tabIndex={-1}
                  className="text-body font-[600] outline-none"
                >
                  {t("removeTitle")}
                </h3>
                <p className="text-small text-ink-muted">{t("removeText")}</p>
                <div className="flex flex-col-reverse gap-2 xs:flex-row xs:justify-end">
                  <Button
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                  >
                    {t("cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    loading={pending}
                    onClick={() => void remove()}
                  >
                    {absence ? t("removeAbsence") : t("remove")}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button onClick={() => setConfirming(true)}>
                  {absence ? t("removeAbsence") : t("remove")}
                </Button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div role="status" aria-label={tc("blockLoading")}>
            <Skeleton lines={3} />
          </div>
        ) : (
          <p className="text-body text-ink-muted">{tc("blockMissing")}</p>
        )}
      </SidePanelContent>
    </SidePanel>
  );
}
