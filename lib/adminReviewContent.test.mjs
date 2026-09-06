import assert from "node:assert/strict";
import test from "node:test";
import { isDistinctPurpose, normalizeReviewText } from "./adminReviewContent.ts";

const renewableRequirement = "Generate renewable energy for at least 2.0% or 40 kWp of total electricity consumption, whichever is greater.";

test("normalization ignores markdown, bullets, whitespace, case, and punctuation", () => {
  assert.equal(
    normalizeReviewText("  • **GENERATE** renewable energy...  "),
    "generate renewable energy",
  );
});

test("an exact duplicate purpose is hidden", () => {
  assert.equal(isDistinctPurpose(renewableRequirement, renewableRequirement), false);
});

test("a formatting-only duplicate purpose is hidden", () => {
  assert.equal(isDistinctPurpose(`- **${renewableRequirement}**`, renewableRequirement), false);
});

test("a near-identical restatement is hidden", () => {
  assert.equal(
    isDistinctPurpose(
      "Generate renewable energy for at least 2.0% of total electricity consumption.",
      "Generate renewable energy for a minimum of 2.0% of the total electricity consumption.",
    ),
    false,
  );
});

test("a useful different purpose remains available", () => {
  assert.equal(
    isDistinctPurpose(
      "Install motion sensors for at least 25% of NLA.",
      "Reduce unnecessary lighting consumption in unoccupied spaces.",
    ),
    true,
  );
});

test("an empty purpose is hidden", () => {
  assert.equal(isDistinctPurpose(renewableRequirement, null), false);
  assert.equal(isDistinctPurpose(renewableRequirement, "  "), false);
});

test("generic purpose placeholders are hidden", () => {
  assert.equal(
    isDistinctPurpose(renewableRequirement, "Requirements vary by project type; open the GBI requirements."),
    false,
  );
  assert.equal(isDistinctPurpose(renewableRequirement, "Refer to the GBI requirements."), false);
});
