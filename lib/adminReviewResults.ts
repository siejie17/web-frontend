export type ReviewResultCategory = "awarded" | "not-awarded";

export function hasUnsavedActualReviewChanges(
  items: Array<{
    item_id: number;
    remarks?: string | null;
    actual_choices: Array<{ choice_key: string; accepted: boolean }>;
  }>,
  awardedDraft: Record<string, boolean>,
  remarksDraft: Record<number, string>,
) {
  return items.some((item) => (
    item.actual_choices.some((choice) => Boolean(awardedDraft[choice.choice_key]) !== choice.accepted)
    || (remarksDraft[item.item_id] || "").trim() !== (item.remarks || "").trim()
  ));
}

export function calculateActualAwardedMarks(
  choices: Array<{ choice_key: string; score: number }>,
  awardedDraft: Record<string, boolean>,
  maximumScore: number,
) {
  return Math.min(
    choices.reduce((total, choice) => total + (awardedDraft[choice.choice_key] ? choice.score : 0), 0),
    maximumScore,
  );
}

export function getReviewResultCategory({
  actualAwardedMarks,
}: {
  actualAwardedMarks: number;
}): ReviewResultCategory {
  return actualAwardedMarks > 0 ? "awarded" : "not-awarded";
}

export function getCertificationReviewState({
  everyItemReviewed,
  hasUnsavedChanges,
  certificationQualified,
  certificateIssued,
}: {
  everyItemReviewed: boolean;
  hasUnsavedChanges: boolean;
  certificationQualified: boolean;
  certificateIssued: boolean;
}) {
  const reviewComplete = everyItemReviewed && !hasUnsavedChanges;

  return {
    reviewComplete,
    certificationDoesNotQualify: reviewComplete && !certificationQualified && !certificateIssued,
    certificationReady: reviewComplete && certificationQualified && !certificateIssued,
  };
}
