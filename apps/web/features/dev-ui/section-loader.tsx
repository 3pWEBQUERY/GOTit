import type { ComponentType } from "react";
import type { UiGroup } from "./groups";

/** Lädt die Testseite einer Gruppe erst, wenn sie aufgerufen wird. */
export async function loadSection(group: UiGroup): Promise<ComponentType> {
  switch (group) {
    case "shell":
      return (await import("./sections/shell-section")).ShellSection;
    case "actions":
      return (await import("./sections/actions-section")).ActionsSection;
    case "input":
      return (await import("./sections/input-section")).InputSection;
    case "search":
      return (await import("./sections/search-section")).SearchSection;
    case "profile":
      return (await import("./sections/profile-section")).ProfileSection;
    case "communication":
      return (await import("./sections/communication-section")).CommunicationSection;
    case "time":
      return (await import("./sections/time-section")).TimeSection;
    case "data":
      return (await import("./sections/data-section")).DataSection;
    case "community":
      return (await import("./sections/community-section")).CommunitySection;
    case "feedback":
      return (await import("./sections/feedback-section")).FeedbackSection;
  }
}
