import assert from "node:assert/strict";
import test from "node:test";
import { calculateActualAwardedMarks, getCertificationReviewState, getReviewResultCategory, hasUnsavedActualReviewChanges } from "./adminReviewResults.ts";

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

const savedReviewItems = [{
  item_id: 1,
  remarks: "Saved reviewer note",
  actual_choices: [
    { choice_key: "measure-a", accepted: true },
    { choice_key: "measure-b", accepted: false },
  ],
}];

test("unchanged Actual decisions and remarks are not dirty", () => {
  assert.equal(hasUnsavedActualReviewChanges(
    savedReviewItems,
    { "measure-a": true, "measure-b": false },
    { 1: "Saved reviewer note" },
  ), false);
});

test("changed Actual decisions or reviewer remarks are dirty", () => {
  assert.equal(hasUnsavedActualReviewChanges(
    savedReviewItems,
    { "measure-a": false, "measure-b": false },
    { 1: "Saved reviewer note" },
  ), true);
  assert.equal(hasUnsavedActualReviewChanges(
    savedReviewItems,
    { "measure-a": true, "measure-b": false },
    { 1: "Updated reviewer note" },
  ), true);
});

test("reverting Actual edits to their saved values clears dirty state", () => {
  const revertedChoices = { "measure-a": true, "measure-b": false };
  const revertedRemarks = { 1: " Saved reviewer note " };
  assert.equal(hasUnsavedActualReviewChanges(savedReviewItems, revertedChoices, revertedRemarks), false);
});
