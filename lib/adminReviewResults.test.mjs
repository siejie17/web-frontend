import assert from "node:assert/strict";
import test from "node:test";
import { calculateActualAwardedMarks, getCertificationReviewState, getReviewResultCategory } from "./adminReviewResults.ts";

test("Actual awarded marks reuse the selected-choice calculation and item cap", () => {
  const choices = [
    { choice_key: "measure-a", score: 2 },
    { choice_key: "measure-b", score: 2 },
  ];

  assert.equal(calculateActualAwardedMarks(choices, { "measure-a": true }, 3), 2);
  assert.equal(calculateActualAwardedMarks(choices, { "measure-a": true, "measure-b": true }, 3), 3);
});

test("a full Actual award belongs to Awarded Actual", () => {
  assert.equal(getReviewResultCategory({ actualAwardedMarks: 3 }), "awarded");
});

test("a partial Actual award belongs to Awarded Actual", () => {
  assert.equal(getReviewResultCategory({ actualAwardedMarks: 2 }), "awarded");
});

test("zero Actual marks belongs to Not awarded", () => {
  assert.equal(getReviewResultCategory({ actualAwardedMarks: 0 }), "not-awarded");
});

test("an unchecked fresh item belongs to Not awarded in the simplified model", () => {
  assert.equal(getReviewResultCategory({ actualAwardedMarks: 0 }), "not-awarded");
});

test("a completed low-score review stays completed and does not qualify", () => {
  assert.deepEqual(getCertificationReviewState({
    predictionApproved: true,
    everyItemReviewed: true,
    hasUnsavedChanges: false,
    certificationQualified: false,
    certificateIssued: false,
  }), {
    reviewComplete: true,
    certificationDoesNotQualify: true,
    certificationReady: false,
  });
});
