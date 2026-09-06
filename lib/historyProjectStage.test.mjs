import assert from "node:assert/strict";
import test from "node:test";
import { getHistoryProjectStage } from "./historyProjectStage.ts";

test("an issued certificate makes the History stage Certified", () => {
  assert.equal(getHistoryProjectStage({ status: "issued" }), "Certified");
});

test("a revoked certificate returns the History stage to Actual Review", () => {
  assert.equal(getHistoryProjectStage({ status: "revoked" }), "Actual Review");
});

test("a project without a certificate remains in Actual Review", () => {
  assert.equal(getHistoryProjectStage(null), "Actual Review");
  assert.equal(getHistoryProjectStage(undefined), "Actual Review");
});
