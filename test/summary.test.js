import test from "node:test";
import assert from "node:assert/strict";

import { buildPeriodSummary, lastCompleteDay, parseStamp, directionFor } from "../src/summary.js";
import { END, addDaily, addNight, daysBack, emptyData, steadyData } from "./helpers/data.js";

test("reads the wall clock where the reading was taken", () => {
  const stamp = parseStamp("2026-10-24 23:30:00 -0500");
  assert.equal(stamp.day, "2026-10-24");
  assert.equal(stamp.minutes, 23 * 60 + 30);
  assert.equal(stamp.ms, Date.UTC(2026, 9, 25, 4, 30));
});

test("stops at the last complete day of the export", () => {
  assert.equal(lastCompleteDay({ exportDate: "2026-10-24 08:00:00 -0500" }), "2026-10-23");
  assert.equal(lastCompleteDay({ exportDate: "2026-10-24 22:15:00 -0500" }), "2026-10-24");
});

test("averages a steady month exactly", () => {
  const summary = buildPeriodSummary(steadyData(), { days: 30 });
  assert.equal(summary.period.start, "2026-09-24");
  assert.equal(summary.period.end, END);
  assert.deepEqual(summary.coverage, { sleep: 30, recovery: 30, activity: 30, nutrition: 0, days: 30 });
  assert.equal(Math.round(summary.current.sleep.averageMinutes), 440);
  assert.equal(Math.round(summary.current.sleep.deepMinutes), 70);
  assert.equal(summary.current.activity.steps, 9000);
  assert.equal(summary.current.activity.totalSteps, 270000);
  assert.equal(summary.current.sleep.bestStreak, 30);
});

test("does not count a watch and a phone twice on the same day", () => {
  const data = steadyData({ count: 10 });
  for (const day of daysBack(10)) addDaily(data, "steps", day, 7000, { source: "Test iPhone" });
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(summary.current.activity.steps, 9000);
});

test("keeps an afternoon nap out of the night's sleep", () => {
  const data = emptyData();
  for (const day of daysBack(10)) addNight(data, day, { deep: 60, rem: 80, core: 300 });
  // A 60-minute nap at 14:00 on the last day.
  data.sleep.push({ value: "HKCategoryValueSleepAnalysisAsleepCore", start: `${END} 14:00:00 -0500`, end: `${END} 15:00:00 -0500`, source: "Test Apple Watch" });
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(Math.round(summary.current.sleep.longestNight.asleepMinutes), 440);
});

test("reads a bedtime after midnight as late, not early", () => {
  const data = emptyData();
  for (const day of daysBack(10)) addNight(data, day, { bedMinutes: 24 * 60 + 30 });
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(Math.round(summary.current.sleep.bedtimeMinutes), 24 * 60 + 30);
  assert.equal(Math.round(summary.current.sleep.bedtimeSpreadMinutes), 0);
});

test("leaves deep and REM out when the device does not record stages", () => {
  const data = emptyData();
  for (const day of daysBack(10)) addNight(data, day, { stages: false });
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(summary.current.sleep.nights, 7);
  assert.equal(summary.current.sleep.stagedNights, 0);
  assert.equal(summary.current.sleep.deepMinutes, null);
});

test("the score is the plain average of the three parts", () => {
  const full = buildPeriodSummary(steadyData({ sleepMinutes: 480, steps: 10000, restingHR: 50 }), { days: 30 });
  assert.equal(full.scores.overall, 100);
  const half = buildPeriodSummary(steadyData({ sleepMinutes: 360, steps: 5000, restingHR: 65 }), { days: 30 });
  assert.deepEqual(half.scores.parts, { sleep: 50, activity: 50, recovery: 50 });
  assert.equal(half.scores.overall, 50);
});

test("no score with fewer than two parts", () => {
  const data = emptyData();
  for (const day of daysBack(30)) addDaily(data, "steps", day, 9000);
  assert.equal(buildPeriodSummary(data, { days: 30 }).scores.overall, null);
});

test("a deep-sleep standout is Lights Out", () => {
  // Bedtimes swing by 90 minutes, so sleep timing does not stand out; only deep sleep clears its mark.
  const data = emptyData();
  for (const [index, day] of daysBack(60).entries()) {
    addNight(data, day, { deep: 85, bedMinutes: 22 * 60 + (index % 2 ? 0 : 90) });
    addDaily(data, "steps", day, 6000);
  }
  const summary = buildPeriodSummary(data, { days: 30 });
  assert.equal(summary.standout.archetype, "lights_out");
  assert.deepEqual(summary.standout.strengths.map((strength) => strength.dimension), ["deep_sleep"]);
});

test("three or more standouts make an All-Rounder", () => {
  const summary = buildPeriodSummary(steadyData({ deep: 80, steps: 11000, hrv: 70 }), { days: 30 });
  assert.equal(summary.standout.archetype, "all_rounder");
});

test("a few days of data is Warming Up", () => {
  const summary = buildPeriodSummary(steadyData({ count: 4 }), { days: 30 });
  assert.equal(summary.standout.archetype, "warming_up");
});

test("no standout but two real gains is On the Rise", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(60).entries()) {
    const recent = index >= 30;
    addNight(data, day, { deep: recent ? 50 : 38, rem: 80, core: 250, bedMinutes: 22 * 60 + (index % 2 ? 0 : 100) });
    addDaily(data, "steps", day, recent ? 6500 : 5000);
  }
  const summary = buildPeriodSummary(data, { days: 30 });
  assert.equal(summary.standout.archetype, "on_the_rise");
  const gains = summary.changes.filter((change) => change.improved).map((change) => change.metric).sort();
  assert.deepEqual(gains, ["deepMinutes", "steps"]);
});

test("nothing standing out and nothing improving is Tracker", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(60).entries()) {
    addNight(data, day, { deep: 40, rem: 70, core: 260, bedMinutes: 22 * 60 + (index % 2 ? 0 : 100) });
    addDaily(data, "steps", day, 5000);
  }
  assert.equal(buildPeriodSummary(data, { days: 30 }).standout.archetype, "tracker");
});

test("small moves between periods do not count as gains", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(60).entries()) {
    addDaily(data, "steps", day, index >= 30 ? 9500 : 9000);
  }
  const change = buildPeriodSummary(data, { days: 30 }).changes.find((entry) => entry.metric === "steps");
  assert.equal(change.delta, 500);
  assert.equal(change.improved, false);
});

test("steps tags follow the achievement bands", () => {
  const tagFor = (steps) => buildPeriodSummary(steadyData({ steps }), { days: 30 })
    .highlights.find((item) => item.key === "total_steps").tier;
  assert.equal(tagFor(15500), "elite");
  assert.equal(tagFor(8500), "strong");
  assert.equal(tagFor(6500), "fair");
  assert.equal(tagFor(4000), null);
});

test("trend arrows use a 3% steady band", () => {
  assert.equal(directionFor(104, 100), "up");
  assert.equal(directionFor(97.5, 100), "steady");
  assert.equal(directionFor(96, 100), "down");
  assert.equal(directionFor(null, 100), null);
});
