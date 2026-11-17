"use client";

import { ReviewsError } from "@/features/reviews/components/shared/review-states";

export default function NewReviewError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return <ReviewsError reset={reset} />;
}
