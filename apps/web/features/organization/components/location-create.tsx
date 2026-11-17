"use client";

import { Button, Dialog, DialogContent, DialogFooter } from "@app/ui";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EMPTY_LOCATION, LocationForm } from "./location-form";

/** «Standort hinzufügen»: kurze Eingabe im Dialog, danach weiter zur Detailseite mit Öffnungszeiten (PRD 13). */
export function LocationCreate({
  slug,
  regions,
  detailHref,
}: {
  slug: string;
  regions: readonly { value: string; label: string }[];
  detailHref: string;
}) {
  const t = useTranslations("organization.locations");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  return (
    <>
      <Button
        variant="primary"
        icon={<Plus aria-hidden strokeWidth={1.5} />}
        onClick={() => {
          setKey((value) => value + 1);
          setOpen(true);
        }}
      >
        {t("add")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title={t("addTitle")}
          description={t("addDescription")}
          closeLabel={t("close")}
          data-location-dialog
        >
          <LocationForm
            key={key}
            slug={slug}
            locationId={null}
            initial={EMPTY_LOCATION}
            regions={regions}
            canEdit
            onSaved={(id) => {
              setOpen(false);
              router.push(detailHref.replace("__id__", encodeURIComponent(id)));
            }}
            footer={(pending) => (
              <DialogFooter className="mt-2">
                <Button disabled={pending} onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" variant="primary" loading={pending}>
                  {t("create")}
                </Button>
              </DialogFooter>
            )}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
