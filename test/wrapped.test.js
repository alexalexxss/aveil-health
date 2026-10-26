import test from "node:test";
import assert from "node:assert/strict";

import { parseHealthExportXml } from "../src/parser.js";
import { buildPeriodSummary } from "../src/summary.js";
import { buildSampleExportXml } from "../src/sample-data.js";
import { buildWrappedModel, generateWrappedHTML } from "../src/wrapped.js";
import { ARCHETYPES } from "../src/copy.js";
import { addDaily, addNight, daysBack, emptyData, steadyData } from "./helpers/data.js";

async function sampleSummary(profile, days = 30) {
  const xml = buildSampleExportXml({ profile, days: days * 2 + 10 });
  const data = await parseHealthExportXml(xml, { days: days * 2 + 2, heartRate: false });
  return buildPeriodSummary(data, { days });
}

test("the card shows the identity, score, standout sentence, and up to four facts", async () => {
  const model = buildWrappedModel(await sampleSummary("mover"));
  assert.equal(model.title, "Engine");
  assert.equal(model.tagline, "You kept moving all month.");
  assert.ok(model.score >= 0 && model.score <= 100);
  assert.match(model.hero.value, /^[\d,]+ steps$/);
  assert.equal(model.hero.accent, true);
  assert.ok([2, 4].includes(model.cells.length));
});

test("the card shows the dates it covers", async () => {
  const model = buildWrappedModel(await sampleSummary("steady"));
  assert.equal(model.range, "Sep 24 – Oct 23, 2026");
  assert.match(generateWrappedHTML(await sampleSummary("steady")).html, /<div class="range">Sep 24 – Oct 23, 2026<\/div>/);
});

test("a week uses the week wording", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(20).entries()) addDaily(data, "steps", day, 5000 + (index % 3) * 10);
  const model = buildWrappedModel(buildPeriodSummary(data, { days: 7 }));
  assert.equal(model.title, ARCHETYPES.tracker_week.title);
  assert.equal(model.periodLine, "Last 7 days");
});

test("the biggest real gain becomes the featured line, and is not repeated in its cell", () => {
  const data = steadyData({ count: 60, steps: 9000 });
  // Add a second 11,000-step reading to each of the last 30 days.
  for (const day of daysBack(30)) addDaily(data, "steps", day, 11000, { source: "Test Apple Watch", hour: 13 });
  const summary = buildPeriodSummary(data, { days: 30 });
  const model = buildWrappedModel(summary);
  assert.equal(model.featured.metric, "steps");
  assert.equal(model.featured.title, "Steps up 11,000 a day");
  const stepsCell = model.cells.find((cell) => cell.label === "Steps this month");
  assert.equal(stepsCell.delta, null);
});

test("no featured line when nothing improved for real", () => {
  const model = buildWrappedModel(buildPeriodSummary(steadyData(), { days: 30 }));
  assert.equal(model.featured, null);
});

test("an empty window says so instead of drawing an empty card", () => {
  const model = buildWrappedModel(buildPeriodSummary(emptyData(), { days: 30 }));
  assert.equal(model.hasData, false);
  const { html } = generateWrappedHTML(buildPeriodSummary(emptyData(), { days: 30 }));
  assert.match(html, /There are no tracked days in this window yet/);
});

test("the only comparison with other people is the age band, and it names its group", async () => {
  for (const profile of ["steady", "short_sleep", "mover"]) {
    const summary = await sampleSummary(profile);
    const { html } = generateWrappedHTML(summary);
    const text = html.replace(/<style[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const withoutBand = text.replace(/Top ~(5|10|25)% recovery among people your age/, "");
    assert.equal(withoutBand.length < text.length, summary.recoveryBand != null, profile);
    assert.doesNotMatch(withoutBand, /\btop\s*~?\d|percentile|\d+\s?%/i, profile);
    assert.doesNotMatch(text, /—/, profile);
    assert.doesNotMatch(text, /mortality|diagnos|\bpoor\b|\blow recovery/i, profile);
    assert.doesNotMatch(text, /\bThe [A-Z][a-z]+ ?[A-Z]?/, profile);
  }
});

test("the age band takes the featured spot in gold; without an age, the biggest move does", () => {
  const withAge = buildWrappedModel(buildPeriodSummary(steadyData({ restingHR: 52, dateOfBirth: "1992-03-14" }), { days: 30 }));
  assert.equal(withAge.featured.title, "Top ~5% recovery");
  assert.equal(withAge.featured.detail, "among people your age");
  assert.equal(withAge.featured.gold, true);
  const html = generateWrappedHTML(buildPeriodSummary(steadyData({ restingHR: 52, dateOfBirth: "1992-03-14" }), { days: 30 })).html;
  assert.match(html, /class="pill pill-gold"/);

  const noAge = steadyData({ count: 60, steps: 9000, restingHR: 52 });
  for (const day of daysBack(30)) addDaily(noAge, "steps", day, 11000, { source: "Test Apple Watch", hour: 13 });
  const model = buildWrappedModel(buildPeriodSummary(noAge, { days: 30 }));
  assert.equal(model.featured.metric, "steps");
  assert.equal(model.featured.gold, false);
});

test("gold is kept for a perfect score", () => {
  const perfect = buildWrappedModel(buildPeriodSummary(steadyData({ sleepMinutes: 480, steps: 10000, restingHR: 50 }), { days: 30 }));
  assert.equal(perfect.perfect, true);
  const good = buildWrappedModel(buildPeriodSummary(steadyData(), { days: 30 }));
  assert.equal(good.perfect, false);
  assert.match(generateWrappedHTML(buildPeriodSummary(steadyData(), { days: 30 })).html, /\.title\{[^}]*color:var\(--ink\)/);
});

test("old analyze() reports get a clear error", () => {
  assert.throws(() => generateWrappedHTML({ overall: { score: 80 } }), /buildPeriodSummary/);
});

test("a workouts-only export still gets a card and a brief", async () => {
  const { generateHealthConsultBriefHTML } = await import("../src/brief.js");
  const data = emptyData();
  for (const [index, day] of daysBack(30).entries()) {
    if (index % 2 === 0) data.workouts.push({ type: "TraditionalStrengthTraining", duration: 45, durationUnit: "min", start: `${day} 18:00:00 -0500`, end: `${day} 18:45:00 -0500`, source: "Test Apple Watch" });
  }
  const summary = buildPeriodSummary(data, { days: 30 });
  const model = buildWrappedModel(summary);
  assert.equal(model.hasData, true);
  assert.ok(model.cells.some((cell) => cell.label === "Strength sessions"));
  const { html } = generateHealthConsultBriefHTML(summary);
  assert.match(html, /Workouts logged: 15 this month, including 15 strength sessions\./);
  assert.doesNotMatch(html, /not enough tracked data/);
});

test("level scales wait for 5 days of data instead of showing the lowest level", () => {
  for (const [count, expected] of [[3, null], [4, null], [5, 4]]) {
    const model = buildWrappedModel(buildPeriodSummary(steadyData({ count, sleepMinutes: 480, steps: 10000, restingHR: 50 }), { days: 7 }));
    const levels = Object.fromEntries(model.levels.map((row) => [row.title, row.level]));
    assert.deepEqual(levels, { Sleep: expected, "Resting heart rate": expected, Steps: expected }, `${count} days`);
  }
  const html = generateWrappedHTML(buildPeriodSummary(steadyData({ count: 4, sleepMinutes: 480, steps: 10000, restingHR: 50 }), { days: 7 })).html;
  assert.doesNotMatch(html, /class="scale"/);
});

test("the HRV level does not depend on which facts fit on the card", () => {
  // Sleep, steps, and HRV only: the HRV fact is trimmed from the two-column grid.
  const data = emptyData();
  for (const day of daysBack(60)) {
    addNight(data, day, { deep: 60, rem: 80, core: 220 });
    addDaily(data, "steps", day, 6000);
    addDaily(data, "hrv", day, 60, { hour: 3, unit: "ms" });
  }
  const model = buildWrappedModel(buildPeriodSummary(data, { days: 30 }));
  assert.ok(!model.cells.some((cell) => cell.label === "Recovery (HRV) average"));
  assert.equal(model.levels.find((row) => row.title === "Recovery (HRV)").level, 3);
});
