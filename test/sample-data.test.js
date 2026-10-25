import test from "node:test";
import assert from "node:assert/strict";

import { buildSampleExportXml, SAMPLE_PROFILES } from "../src/sample-data.js";

test("the synthetic export is the same every time for the same options", () => {
  assert.equal(buildSampleExportXml({ days: 20 }), buildSampleExportXml({ days: 20 }));
  assert.notEqual(buildSampleExportXml({ days: 20, seed: 1 }), buildSampleExportXml({ days: 20, seed: 2 }));
});

test("every profile builds, and the export date is the chosen end date", () => {
  for (const profile of Object.keys(SAMPLE_PROFILES)) {
    const xml = buildSampleExportXml({ profile, days: 5, endDate: "2026-01-15" });
    assert.match(xml, /<ExportDate value="2026-01-15 08:02:00 -0500"\/>/);
    assert.match(xml, /HKCategoryValueSleepAnalysisAsleepDeep/);
  }
  assert.throws(() => buildSampleExportXml({ profile: "nobody" }), /Unknown sample profile/);
});
