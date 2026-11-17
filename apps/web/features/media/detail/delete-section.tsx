"use client";

import { Button, useToast } from "@app/ui";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeleteMediaDialog } from "../library/delete-media-dialog";
import { PROFILE_SCOPE, type MediaScope } from "../library/types";

/** Löschen mit Dialog «Medium löschen» (PRD 13); danach zurück zur Bibliothek. */
export function DeleteSection({ mediaId, libraryHref, scope = PROFILE_SCOPE }: { mediaId: string; libraryHref: string; scope?: MediaScope }) {
  const t = useTranslations("media.detail");
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" icon={<Trash2 aria-hidden strokeWidth={1.5} />} className="self-start" onClick={() => setOpen(true)}>
        {t("delete")}
      </Button>
      <DeleteMediaDialog
        mediaIds={[mediaId]}
        scope={scope}
        open={open}
        onOpenChange={setOpen}
        onDeleted={() => {
          toast({ title: t("deleted"), tone: "success" });
          router.push(libraryHref);
        }}
      />
    </>
  );
}
