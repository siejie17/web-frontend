import assert from "node:assert/strict";
import test from "node:test";
import { formatEsgMapping, parseMidaCriteria, splitEsgDialogContent, splitEsgMapping } from "./esgMapping.ts";

test("preserves and labels an existing Sarawak mapping before MIDA ESG", () => {
  assert.equal(
    formatEsgMapping("- **ET-S6:** Existing wording\n\n## MIDA ESG\n\n- Mapping"),
    "## Sarawak 13th Malaysia Plan\n\n- **ET-S6:** Existing wording\n\n## MIDA ESG\n\n- Mapping",
  );
});

test("does not add an empty Sarawak section when only MIDA ESG exists", () => {
  assert.equal(formatEsgMapping("\n## MIDA ESG\n\n- Mapping"), "## MIDA ESG\n\n- Mapping");
});

test("keeps the existing presentation for a Sarawak-only mapping", () => {
  assert.equal(
    formatEsgMapping("- Existing wording"),
    "## Sarawak 13th Malaysia Plan\n\n- Existing wording",
  );
});

test("splits framework content for independent UI treatment", () => {
  assert.deepEqual(
    splitEsgMapping("- Existing wording\n\n## MIDA ESG\n\n### Water management\n\n- Mapping"),
    {
      sarawak: "- Existing wording",
      mida: "### Water management\n\n- Mapping",
    },
  );
});

test("parses compact MIDA details without repeating the criterion field", () => {
  assert.deepEqual(
    parseMidaCriteria("### Water management\n\n- **Impact Area:** Environment\n- **Criterion:** Water management\n- **Mapping Status:** Partially mapped"),
    [{
      criterion: "Water management",
      fields: [
        { label: "Impact Area", value: "Environment" },
        { label: "Mapping Status", value: "Partially mapped" },
      ],
    }],
  );
});

test("separates the three user-facing ESG dialog sections", () => {
  assert.deepEqual(
    splitEsgDialogContent("## Sarawak 13th Malaysia Plan\n\n- Plan\n\n## MIDA ESG\n\n### Energy\n\n- Mapping\n\n## Materials & Suggestions\n\n**1. Sensor**"),
    {
      sarawak: "- Plan",
      mida: "### Energy\n\n- Mapping",
      suggestions: "**1. Sensor**",
    },
  );
});
