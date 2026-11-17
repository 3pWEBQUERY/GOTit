"use client";

import type { PauseAvailability } from "@app/core/provider-profile";
import type { ProviderStatus } from "@app/db";
import { Button, useToast } from "@app/ui";
import { Ban, CircleAlert, CircleCheck, CircleDashed, CirclePause, CircleMinus, Clock } from "lucide-react";
import { useState, useTransition } from "react";
import { setProfilePaused } from "../actions/set-profile-paused";

const icons = {
  DRAFT: CircleDashed,
  SUBMITTED: Clock,
  CHANGES_REQUESTED: CircleAlert,
  PUBLISHED: CircleCheck,
  PAUSED: CirclePause,
  RESTRICTED: CircleMinus,
  SUSPENDED: Ban,
  ARCHIVED: CircleDashed,
} as const;

export interface ProfileStatusLabels {
  prefix: string;
  status: Record<ProviderStatus, string>;
  pause: string;
  resume: string;
  paused: string;
  resumed: string;
  undo: string;
  failed: string;
  blocked: { "not-published": string; suspended: string; restricted: string };
}

/**
 * Profilstatus mit «Profil pausieren»: ein Klick, sofort wirksam, mit
 * Rückgängig im Toast (PRD 6.2, 13). Der Status steht als Icon und Wort da,
 * neutral und nicht grün.
 */
export function ProfileStatus({
  initialStatus,
  initialAvailability,
  labels,
}: {
  initialStatus: ProviderStatus;
  initialAvailability: PauseAvailability;
  labels: ProfileStatusLabels;
}) {
  const [{ status, availability }, setState] = useState({ status: initialStatus, availability: initialAvailability });
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const Icon = icons[status];

  function change(paused: boolean, offerUndo: boolean) {
    startTransition(async () => {
      const result = await setProfilePaused({ paused });
      if (!result.ok) {
        toast({ tone: "error", title: labels.failed });
        return;
      }
      setState({ status: result.status, availability: result.availability });
      toast({
        tone: "success",
        title: paused ? labels.paused : labels.resumed,
        action: offerUndo ? { label: labels.undo, onAction: () => change(!paused, false) } : undefined,
      });
    });
  }

  return (
    <div data-profile-status={status} className="flex flex-col gap-2 px-1">
      <p className="flex items-center gap-2 text-small text-ink">
        <Icon aria-hidden strokeWidth={1.5} className="size-4 shrink-0" />
        <span>
          {labels.prefix} <span className="font-[550]">{labels.status[status]}</span>
        </span>
      </p>
      {availability.action ? (
        <Button variant="secondary" loading={pending} onClick={() => change(availability.action === "pause", true)}>
          {availability.action === "pause" ? labels.pause : labels.resume}
        </Button>
      ) : availability.blockedBy ? (
        <p className="text-small text-ink-muted">{labels.blocked[availability.blockedBy]}</p>
      ) : null}
    </div>
  );
}
