import type { Locale } from "@app/core/locale";
import { InternalRole } from "@app/db";
import { getTranslations } from "next-intl/server";
import { AdminForm } from "../areas/admin-form";
import { setRolesAction } from "./actions";

/** Interne Rollen eines Kontos ersetzen, mit Begründung (nur Super-Admin; Entscheid 0020). */
export async function RolesForm({ locale, userId, current }: { locale: Locale; userId: string; current: readonly string[] }) {
  const t = await getTranslations({ locale, namespace: "adminUsers" });
  return (
    <AdminForm
      id={`rollen-${userId}`}
      action={setRolesAction.bind(null, userId)}
      fields={[
        { kind: "checkboxes", name: "roles", label: t("rolesForm.roles"), hint: t("rolesForm.rolesHint"), optional: true, options: Object.values(InternalRole).map((role) => ({ value: role, label: t(`roles.${role}`) })), defaultValues: [...current] },
        { kind: "textarea", name: "reason", label: t("rolesForm.reason"), hint: t("rolesForm.reasonHint"), minLength: 10, maxLength: 500, rows: 3 },
      ]}
      submitLabel={t("rolesForm.submit")}
      successMessage={t("rolesForm.saved")}
    />
  );
}
