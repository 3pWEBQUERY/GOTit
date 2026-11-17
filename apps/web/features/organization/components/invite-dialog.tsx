"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  InlineAlert,
  Select,
  TextArea,
  TextField,
  useToast,
} from "@app/ui";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { inviteProviderAction } from "../actions/links";
import { parseProviderSlug } from "../lib/provider-slug";

const NO_LOCATION = "ohne";

/**
 * «Einladen» (v1 FR-BUSINESS-003): Profilname oder eingefügte Profil-URL,
 * optional Standort und Nachricht. Aktiv wird die Verknüpfung erst, wenn der
 * Anbieter zustimmt; bis dahin steht sie als «Eingeladen» in der Tabelle.
 */
export function InviteDialog({
  slug,
  locations,
}: {
  slug: string;
  locations: readonly { id: string; name: string }[];
}) {
  const t = useTranslations("organization.invite");
  const tForm = useTranslations("organization.form");
  const router = useRouter();
  const { toast } = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [locationId, setLocationId] = useState(NO_LOCATION);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{
    providerSlug?: string;
    message?: string;
  }>({});
  const [failed, setFailed] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setProvider("");
    setLocationId(NO_LOCATION);
    setMessage("");
    setErrors({});
    setFailed(null);
  }

  function check(): { providerSlug?: string; message?: string } {
    const found: { providerSlug?: string; message?: string } = {};
    if (!parseProviderSlug(provider)) found.providerSlug = "slug";
    if (message.trim().length > 500) found.message = "too-long";
    return found;
  }

  const text = (code: string | undefined) =>
    code
      ? t.has(`errors.${code}`)
        ? t(`errors.${code}`)
        : tForm("errors.invalid")
      : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(null);
    const found = check();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus(),
      );
      return;
    }
    setPending(true);
    const input = {
      providerSlug: parseProviderSlug(provider),
      locationId: locationId === NO_LOCATION ? null : locationId,
      message,
    };
    const result = await inviteProviderAction(slug, input).catch(() => ({
      ok: false as const,
      formError: "generic",
      fieldErrors: undefined,
    }));
    setPending(false);
    if (result.ok) {
      toast({ title: t("sent"), tone: "success" });
      setOpen(false);
      reset();
      router.refresh();
      return;
    }
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("[aria-invalid=true]")
          ?.focus(),
      );
      return;
    }
    setFailed(result.formError ?? "generic");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="primary"
          icon={<UserPlus aria-hidden strokeWidth={1.5} />}
        >
          {t("open")}
        </Button>
      </DialogTrigger>
      <DialogContent
        title={t("title")}
        description={t("description")}
        closeLabel={t("close")}
        data-invite-dialog
      >
        <form
          ref={form}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4"
        >
          <TextField
            id="einladen-profil"
            label={t("provider")}
            hint={t("providerHint")}
            autoComplete="off"
            spellCheck={false}
            value={provider}
            error={text(errors.providerSlug)}
            onChange={(event) => setProvider(event.target.value)}
            onBlur={() =>
              setErrors((current) => ({
                ...current,
                providerSlug:
                  provider.trim() === "" || parseProviderSlug(provider)
                    ? undefined
                    : "slug",
              }))
            }
          />
          {locations.length > 0 ? (
            <Select
              id="einladen-standort"
              label={t("location")}
              optionalLabel={tForm("optional")}
              options={[
                { value: NO_LOCATION, label: t("noLocation") },
                ...locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                })),
              ]}
              value={locationId}
              onValueChange={setLocationId}
            />
          ) : null}
          <TextArea
            id="einladen-nachricht"
            label={t("message")}
            hint={t("messageHint")}
            optionalLabel={tForm("optional")}
            rows={3}
            maxLength={500}
            countLabel={(used, max) => tForm("count", { used, max })}
            value={message}
            error={text(errors.message)}
            onChange={(event) => setMessage(event.target.value)}
          />
          {failed ? (
            <InlineAlert tone="error" title={tForm(`errors.${failed}`)}>
              {tForm("nothingLost")}
            </InlineAlert>
          ) : null}
          <DialogFooter className="mt-2">
            <Button disabled={pending} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
