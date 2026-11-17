"use server";

import { completeStep, saveOffer, saveProfileBasics, saveRegions, type SaveResult } from "@app/core/onboarding";
import { offerSchema, profileBasicsSchema, regionsSchema } from "@app/core/onboarding/schemas";
import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { fieldErrorsFromZod, type ActionResult } from "../../account/action-result";
import { ownProviderUserId } from "./own-provider";

/** Prüft die Eingabe erneut mit dem Schema des Formulars und speichert nur das eigene Profil. */
async function save(schema: ZodType, input: unknown, write: (userId: string, data: unknown) => Promise<SaveResult>): Promise<ActionResult> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const result = await write(userId, parsed.data);
  if (!result.ok)
    return result.reason === "invalid-region" ? { ok: false, fieldErrors: { regionIds: "invalidRegion" } } : { ok: false, formError: "notEditable" };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveRegionsAction(input: unknown): Promise<ActionResult> {
  return save(regionsSchema, input, saveRegions);
}

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  return save(profileBasicsSchema, input, saveProfileBasics);
}

export async function saveOfferAction(input: unknown): Promise<ActionResult> {
  return save(offerSchema, input, saveOffer);
}

const SKIPPABLE = ["media", "availability", "preview"] as const;

/** Medien und Verfügbarkeit überspringen, Vorschau bestätigen. */
export async function completeStepAction(step: unknown): Promise<ActionResult> {
  const userId = await ownProviderUserId();
  if (!userId) return { ok: false, formError: "notAllowed" };
  const key = SKIPPABLE.find((candidate) => candidate === step);
  if (!key) return { ok: false, formError: "generic" };
  const result = await completeStep(userId, key);
  if (!result.ok) return { ok: false, formError: "notEditable" };
  revalidatePath("/", "layout");
  return { ok: true };
}
