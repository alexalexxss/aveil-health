import test from "node:test";
import assert from "node:assert/strict";

import { computeDerivedStat, computeWalkStat } from "./wrapped.js";

test("computeWalkStat only claims routes that are actually reached", () => {
  const stat = computeWalkStat({
    activity: {
      available: true,
      totalDays: 365,
      averages: { stepsPerDay: 13900 },
    },
  });

  assert.ok(stat);
  assert.match(stat.text, /London → Istanbul/);
  assert.doesNotMatch(stat.text, /New York → Los Angeles/);
});

test("computeDerivedStat uses tracked-period deep sleep totals", () => {
  const stat = computeDerivedStat({
    sleep: {
      available: true,
      nightsAnalyzed: 365,
      averages: {
        deepMinutes: 72,
        bedtimeVariability: 0,
      },
    },
    activity: {
      totalDays: 365,
    },
  });

  assert.ok(stat);
  assert.match(stat.text, /days of deep sleep total/);
  assert.match(stat.text, /72 min a night/);
});
