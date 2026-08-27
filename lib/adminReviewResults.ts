export type ReviewResultCategory = "awarded" | "not-awarded";

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
  predictionApproved,
  everyItemReviewed,
  hasUnsavedChanges,
  certificationQualified,
  certificateIssued,
}: {
  predictionApproved: boolean;
  everyItemReviewed: boolean;
  hasUnsavedChanges: boolean;
  certificationQualified: boolean;
  certificateIssued: boolean;
}) {
  const reviewComplete = everyItemReviewed && !hasUnsavedChanges;

  return {
    reviewComplete,
    certificationDoesNotQualify: predictionApproved && reviewComplete && !certificationQualified && !certificateIssued,
    certificationReady: predictionApproved && reviewComplete && certificationQualified && !certificateIssued,
  };
}
