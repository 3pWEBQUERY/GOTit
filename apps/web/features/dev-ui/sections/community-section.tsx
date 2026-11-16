"use client";

import { CommunityCardsDemo } from "./community-cards-demo";
import { CommunityCommentDemo } from "./community-comment-demo";
import { CommunityPostDemo } from "./community-post-demo";
import { CommunityStoryDemo } from "./community-story-demo";

/** Testseite der Gruppe «Community»: jede Komponente in allen Zuständen. Fotos sind neutrale Flächen mit Initialen. */
export function CommunitySection() {
  return (
    <div className="flex flex-col gap-16">
      <CommunityStoryDemo />
      <CommunityPostDemo />
      <CommunityCommentDemo />
      <CommunityCardsDemo />
    </div>
  );
}
