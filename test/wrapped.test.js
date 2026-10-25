import test from "node:test";
import assert from "node:assert/strict";

import { parseHealthExportXml } from "../src/parser.js";
import { buildPeriodSummary } from "../src/summary.js";
import { buildSampleExportXml } from "../src/sample-data.js";
import { buildWrappedModel, generateWrappedHTML } from "../src/wrapped.js";
import { ARCHETYPES } from "../src/copy.js";
import { addDaily, daysBack, emptyData, steadyData } from "./helpers/data.js";

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

test("the HTML makes no population claims and uses no em dashes", async () => {
  for (const profile of ["steady", "short_sleep", "mover"]) {
    const { html } = generateWrappedHTML(await sampleSummary(profile));
    const text = html.replace(/<style[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(text, /—/, profile);
    assert.doesNotMatch(text, /\btop\s*~?\d|percentile|\d+\s?%/i, profile);
    assert.doesNotMatch(text, /mortality|diagnos|\bpoor\b|\blow recovery/i, profile);
    assert.doesNotMatch(text, /\bThe [A-Z][a-z]+ ?[A-Z]?/, profile);
  }
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
