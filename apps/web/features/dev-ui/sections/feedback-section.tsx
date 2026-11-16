"use client";

import { ToastProvider, TooltipProvider } from "@app/ui";
import { FeedbackLoadingDemo } from "./feedback-loading-demo";
import { FeedbackMessagesDemo } from "./feedback-messages-demo";
import { FeedbackOverlaysDemo } from "./feedback-overlays-demo";
import { FeedbackStatesDemo } from "./feedback-states-demo";

/** Testseite der Gruppe «Rückmeldung»: jede Komponente in allen Zuständen. */
export function FeedbackSection() {
  return (
    <ToastProvider labels={{ close: "Meldung schliessen", region: "Meldungen ({hotkey})" }}>
      <TooltipProvider>
        <div className="flex flex-col gap-16">
          <FeedbackMessagesDemo />
          <FeedbackLoadingDemo />
          <FeedbackStatesDemo />
          <FeedbackOverlaysDemo />
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}
