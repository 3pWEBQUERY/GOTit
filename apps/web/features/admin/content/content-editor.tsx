"use client";

import { Button, Checkbox, InlineAlert, Select, TextArea, TextField, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MarkdownView } from "../../content/markdown-view";
import { saveContentAction } from "./actions";

export interface ContentDraft {
  kind: string;
  slug: string;
  locale: string;
  title: string;
  summary: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
}

const FIELDS = ["kind", "locale", "slug", "title", "summary", "body", "metaTitle", "metaDescription"] as const;
type Field = (typeof FIELDS)[number];
const LIMITS: Partial<Record<Field, number>> = { title: 120, summary: 300, body: 50_000, metaTitle: 70, metaDescription: 160 };

/**
 * Editor einer CMS-Seite (v2 7.8): Titel, Kurztext, Text in Markdown mit
 * Vorschau, Metadaten mit Zählern. Eine veröffentlichte Seite ändert sich
 * beim Speichern sofort; darauf weist der Editor vorher hin.
 */
export function ContentEditor({ locale, id, initial, published }: { locale: string; id: string | null; initial: ContentDraft; published: boolean }) {
  const t = useTranslations("adminContent.editor");
  const tForm = useTranslations("adminCommon.form");
  const tError = useTranslations("adminCommon.errors");
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<ContentDraft>(initial);
  const [publish, setPublish] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fieldId = (field: Field) => `inhalt-${field}`;

  function set(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  const errorText = (field: Field) => (errors[field] ? tError(errors[field], { min: 1, max: LIMITS[field] ?? 0 }) : undefined);
  const counter = (field: Field) => t("counter", { used: values[field].trim().length, max: LIMITS[field] ?? 0 });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const local: Record<string, string> = {};
    for (const field of ["kind", "locale", "slug", "title"] as const) if (!values[field].trim()) local[field] = "required";
    if (Object.keys(local).length > 0) {
      setErrors(local);
      focus(Object.keys(local));
      return;
    }
    setPending(true);
    setFormError(null);
    const result = await saveContentAction(locale as never, id, { ...values, publish }).catch(() => ({ ok: false as const, formError: "generic", fieldErrors: undefined }));
    setPending(false);
    if (result.ok) {
      toast({ title: published ? t("savedLive") : publish ? t("savedPublished") : t("saved"), tone: "success" });
      const target = result.data?.redirectTo;
      if (target) router.push(target);
      else router.refresh();
      return;
    }
    setErrors(result.fieldErrors ?? {});
    setFormError(result.formError ?? null);
    focus(Object.keys(result.fieldErrors ?? {}));
  }

  function focus(keys: string[]) {
    const first = FIELDS.find((field) => keys.includes(field));
    if (!first) return;
    if (first === "body") setTab("write");
    requestAnimationFrame(() => {
      const element = document.getElementById(fieldId(first));
      (element?.matches("input,textarea,button") ? element : element?.querySelector<HTMLElement>("input,textarea,button"))?.focus();
    });
  }

  const summary = FIELDS.filter((field) => errors[field]).map((field) => ({ field, message: `${t(`fields.${field}`)}: ${errorText(field) ?? ""}` }));

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex max-w-3xl flex-col gap-5" data-content-editor>
      {summary.length > 0 ? (
        <InlineAlert tone="error" title={tForm("summaryTitle", { count: summary.length })}>
          <ul className="flex flex-col gap-1">
            {summary.map((item) => (
              <li key={item.field}>
                <a
                  href={`#${fieldId(item.field)}`}
                  className="text-ink underline underline-offset-2"
                  onClick={(event) => {
                    event.preventDefault();
                    focus([item.field]);
                  }}
                >
                  {item.message}
                </a>
              </li>
            ))}
          </ul>
        </InlineAlert>
      ) : null}
      {formError ? <InlineAlert tone="error" title={tError(formError)} /> : null}
      {published ? (
        <InlineAlert tone="warning" title={t("liveTitle")}>
          {t("liveText")}
        </InlineAlert>
      ) : null}
      <div className="grid gap-5 md:grid-cols-3">
        <Select
          id={fieldId("kind")}
          label={t("fields.kind")}
          placeholder={tForm("choose")}
          value={values.kind || undefined}
          onValueChange={(value) => set("kind", value)}
          options={(["HELP", "LEGAL", "PAGE"] as const).map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
          error={errorText("kind")}
        />
        <Select
          id={fieldId("locale")}
          label={t("fields.locale")}
          placeholder={tForm("choose")}
          value={values.locale || undefined}
          onValueChange={(value) => set("locale", value)}
          options={(["de", "fr", "it", "en"] as const).map((code) => ({ value: code, label: t(`locales.${code}`) }))}
          error={errorText("locale")}
        />
        <TextField id={fieldId("slug")} label={t("fields.slug")} hint={t("slugHint")} maxLength={80} value={values.slug} onChange={(event) => set("slug", event.target.value)} error={errorText("slug")} />
      </div>
      <TextField id={fieldId("title")} label={t("fields.title")} hint={counter("title")} maxLength={120} value={values.title} onChange={(event) => set("title", event.target.value)} error={errorText("title")} />
      <TextArea id={fieldId("summary")} label={t("fields.summary")} optionalLabel={tForm("optional")} hint={t("summaryHint")} rows={2} maxLength={300} countLabel={(used, max) => tForm("count", { used, max })} value={values.summary} onChange={(event) => set("summary", event.target.value)} error={errorText("summary")} />

      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label={t("bodyTabs")} className="flex gap-1 border-b border-border">
          {(["write", "preview"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`inhalt-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`inhalt-panel-${key}`}
              onClick={() => setTab(key)}
              className={`-mb-px min-h-10 border-b-2 px-3 text-small ${tab === key ? "border-accent font-[550] text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="inhalt-panel-write" aria-labelledby="inhalt-tab-write" hidden={tab !== "write"}>
          <TextArea id={fieldId("body")} label={t("fields.body")} hint={t("bodyHint")} rows={16} maxLength={50_000} value={values.body} onChange={(event) => set("body", event.target.value)} error={errorText("body")} />
        </div>
        <div role="tabpanel" id="inhalt-panel-preview" aria-labelledby="inhalt-tab-preview" hidden={tab !== "preview"} className="rounded-card border border-border p-4" data-content-preview>
          {values.title ? <p className="pb-2 text-h1">{values.title}</p> : null}
          {values.body.trim() ? <MarkdownView source={values.body} /> : <p className="text-body text-ink-muted">{t("previewEmpty")}</p>}
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 border-t border-border pt-4">
        <legend className="text-h3">{t("metaTitle")}</legend>
        <p className="text-small text-ink-muted">{t("metaIntro")}</p>
        <TextField id={fieldId("metaTitle")} label={t("fields.metaTitle")} optionalLabel={tForm("optional")} hint={counter("metaTitle")} maxLength={70} value={values.metaTitle} onChange={(event) => set("metaTitle", event.target.value)} error={errorText("metaTitle")} />
        <TextArea id={fieldId("metaDescription")} label={t("fields.metaDescription")} optionalLabel={tForm("optional")} rows={2} maxLength={160} countLabel={(used, max) => tForm("count", { used, max })} value={values.metaDescription} onChange={(event) => set("metaDescription", event.target.value)} error={errorText("metaDescription")} />
      </fieldset>

      {!id ? <Checkbox label={t("publishNow")} description={t("publishNowHint")} checked={publish} onCheckedChange={(checked) => setPublish(checked === true)} /> : null}
      <Button type="submit" variant="primary" loading={pending} className="self-start">
        {id ? (published ? t("saveLive") : t("save")) : t("create")}
      </Button>
    </form>
  );
}
