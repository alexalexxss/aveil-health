import test from "node:test";
import assert from "node:assert/strict";

import { buildPeriodSummary, lastCompleteDay, parseStamp, directionFor } from "../src/summary.js";
import { END, addDaily, addNight, daysBack, emptyData, steadyData } from "./helpers/data.js";
import { addDays } from "./helpers/xml.js";

test("reads the wall clock where the reading was taken", () => {
  const stamp = parseStamp("2026-10-24 23:30:00 -0500");
  assert.equal(stamp.day, "2026-10-24");
  assert.equal(stamp.minutes, 23 * 60 + 30);
  assert.equal(stamp.ms, Date.UTC(2026, 9, 25, 4, 30));
});

test("stops at the day before the export, which is still unfinished", () => {
  assert.equal(lastCompleteDay({ exportDate: "2026-10-24 08:00:00 -0500" }), "2026-10-23");
  assert.equal(lastCompleteDay({ exportDate: "2026-10-24 22:15:00 -0500" }), "2026-10-23");
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

test("two watches covering the same hour count once", () => {
  const data = emptyData();
  for (const day of daysBack(10)) {
    addDaily(data, "steps", day, 3000, { source: "Test Apple Watch", hour: 9, minutes: 60 });
    addDaily(data, "steps", day, 2800, { source: "Old Apple Watch", hour: 9, minutes: 60 });
  }
  assert.equal(Math.round(buildPeriodSummary(data, { days: 7 }).current.activity.steps), 3000);
});

test("phone steps still count for the hours the watch was off", () => {
  const data = emptyData();
  for (const day of daysBack(10)) {
    addDaily(data, "steps", day, 4000, { source: "Test Apple Watch", hour: 8, minutes: 120 });
    // The phone saw the same morning walk, plus an afternoon without the watch.
    addDaily(data, "steps", day, 3500, { source: "Test iPhone", hour: 8, minutes: 120 });
    addDaily(data, "steps", day, 2500, { source: "Test iPhone", hour: 15, minutes: 60 });
  }
  assert.equal(Math.round(buildPeriodSummary(data, { days: 7 }).current.activity.steps), 6500);
});

test("a partial overlap counts only the uncovered part", () => {
  const data = emptyData();
  for (const day of daysBack(10)) {
    addDaily(data, "steps", day, 1000, { source: "Test Apple Watch", hour: 10, minutes: 60 });
    // 10:30 to 11:30 on the phone: half of it is already covered by the watch.
    data.steps.push({ value: 800, unit: "count", start: `${day} 10:30:00 -0500`, end: `${day} 11:30:00 -0500`, source: "Test iPhone" });
  }
  assert.equal(Math.round(buildPeriodSummary(data, { days: 7 }).current.activity.steps), 1400);
});

test("sleep that runs past 6 PM stays one sleep", () => {
  const data = emptyData();
  for (const day of daysBack(10)) {
    // A day sleeper: 10:00 to 16:00 core, then 16:00 to 18:30 REM.
    data.sleep.push({ value: "HKCategoryValueSleepAnalysisAsleepCore", start: `${day} 10:00:00 -0500`, end: `${day} 16:00:00 -0500`, source: "Test Apple Watch" });
    data.sleep.push({ value: "HKCategoryValueSleepAnalysisAsleepREM", start: `${day} 16:00:00 -0500`, end: `${day} 18:30:00 -0500`, source: "Test Apple Watch" });
  }
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(summary.current.sleep.nights, 7);
  assert.equal(Math.round(summary.current.sleep.averageMinutes), 510);
});

test("resting heart rate alone still counts as recovery coverage", () => {
  const data = emptyData();
  for (const day of daysBack(30)) addDaily(data, "restingHR", day, 58, { unit: "count/min" });
  const summary = buildPeriodSummary(data, { days: 30 });
  assert.equal(summary.coverage.recovery, 30);
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

test("unequal parts average plainly, with two or three parts", () => {
  const three = buildPeriodSummary(steadyData({ sleepMinutes: 480, steps: 5000, restingHR: 80 }), { days: 30 });
  assert.deepEqual(three.scores.parts, { sleep: 100, activity: 50, recovery: 0 });
  assert.equal(three.scores.overall, 50);
  const data = emptyData();
  for (const day of daysBack(30)) {
    addNight(data, day, { deep: 70, rem: 90, core: 320 });
    addDaily(data, "steps", day, 5000);
  }
  const two = buildPeriodSummary(data, { days: 30 });
  assert.deepEqual(two.scores.parts, { sleep: 100, activity: 50 });
  assert.equal(two.scores.overall, 75);
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

test("the recovery band needs a known age", () => {
  assert.equal(buildPeriodSummary(steadyData({ restingHR: 52 }), { days: 30 }).recoveryBand, null);
});

test("the recovery band rounds to top 5, 10, or 25% and stays quiet below the top quarter", () => {
  const bandFor = (restingHR, extra = {}) => buildPeriodSummary(
    steadyData({ restingHR, hrv: 40, dateOfBirth: "1992-03-14", ...extra }), { days: 30 }).recoveryBand;
  // Age 34: resting heart rate norm 67 bpm, spread 9.
  assert.deepEqual(bandFor(52), { band: 5, basis: "rhr" });
  assert.deepEqual(bandFor(55), { band: 10, basis: "rhr" });
  assert.deepEqual(bandFor(60), { band: 25, basis: "rhr" });
  assert.equal(bandFor(64), null);
});

test("HRV is used first, against the SDNN norm for the age", () => {
  const summary = buildPeriodSummary(steadyData({ hrv: 90, restingHR: 52, dateOfBirth: "1992-03-14" }), { days: 30 });
  assert.deepEqual(summary.recoveryBand, { band: 10, basis: "hrv" });
});

test("women's resting heart rate norm sits 3 bpm higher", () => {
  const bandFor = (sex) => buildPeriodSummary(
    steadyData({ restingHR: 61, hrv: 40, dateOfBirth: "1992-03-14", sex }), { days: 30 }).recoveryBand;
  assert.deepEqual(bandFor("HKBiologicalSexFemale"), { band: 25, basis: "rhr" });
  assert.equal(bandFor("HKBiologicalSexMale"), null);
});

test("the recovery band needs at least 10 days of readings", () => {
  const summary = buildPeriodSummary(steadyData({ count: 9, restingHR: 50, dateOfBirth: "1992-03-14" }), { days: 30 });
  assert.equal(summary.recoveryBand, null);
});

test("a reading that crosses midnight is split between the two days", () => {
  const data = emptyData();
  for (const day of [...daysBack(10), addDays(END, 1)]) {
    // 2,000 steps from 23:50 to 00:10: half belong to each day.
    data.steps.push({ value: 2000, unit: "count", start: `${addDays(day, -1)} 23:50:00 -0500`, end: `${day} 00:10:00 -0500`, source: "Test Apple Watch" });
    // The phone saw the same steps after midnight.
    data.steps.push({ value: 900, unit: "count", start: `${day} 00:00:00 -0500`, end: `${day} 00:10:00 -0500`, source: "Test iPhone" });
  }
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(Math.round(summary.current.activity.steps), 2000);
  assert.equal(Math.round(summary.current.activity.totalSteps), 14000);
});

test("steps from the unfinished export day stay out of the window", () => {
  const data = emptyData();
  for (const day of daysBack(10)) addDaily(data, "steps", day, 6000, { hour: 10, minutes: 60 });
  // 23:00 on the last full day to 01:00 on the export day.
  data.steps.push({ value: 4000, unit: "count", start: `${END} 23:00:00 -0500`, end: `${addDays(END, 1)} 01:00:00 -0500`, source: "Test Apple Watch" });
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(Math.round(summary.current.activity.bestStepDay.value), 8000);
});

test("bedtimes either side of noon stay close for a day sleeper", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(10).entries()) {
    const start = index % 2 ? "11:55" : "12:05";
    data.sleep.push({ value: "HKCategoryValueSleepAnalysisAsleepCore", start: `${day} ${start}:00 -0500`, end: `${day} 19:00:00 -0500`, source: "Test Apple Watch" });
  }
  const summary = buildPeriodSummary(data, { days: 7 });
  assert.equal(Math.round(summary.current.sleep.bedtimeSpreadMinutes), 5);
});

test("bedtimes either side of midnight stay close too", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(10).entries()) addNight(data, day, { bedMinutes: index % 2 ? 23 * 60 + 50 : 24 * 60 + 10 });
  assert.equal(Math.round(buildPeriodSummary(data, { days: 7 }).current.sleep.bedtimeSpreadMinutes), 10);
});

test("nights with only Core sleep still count toward the stage averages", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(10).entries()) addNight(data, day, { deep: index % 2 ? 60 : 0, rem: 0, core: 360 });
  const summary = buildPeriodSummary(data, { days: 10 });
  assert.equal(summary.current.sleep.stagedNights, 10);
  assert.equal(Math.round(summary.current.sleep.deepMinutes), 30);
});

test("an export with workouts but no steps is not empty", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(30).entries()) {
    if (index % 2 === 0) data.workouts.push({ type: "Running", duration: 40, durationUnit: "min", start: `${day} 18:00:00 -0500`, end: `${day} 18:40:00 -0500`, source: "Test Apple Watch" });
  }
  const summary = buildPeriodSummary(data, { days: 30 });
  assert.equal(summary.coverage.activity, 15);
  assert.equal(summary.current.activity.workouts, 15);
});
