import test from "node:test";
import assert from "node:assert/strict";

import { parseHealthExportXml } from "../src/parser.js";
import { buildPeriodSummary } from "../src/summary.js";
import { buildSampleExportXml } from "../src/sample-data.js";
import {
  buildBriefModel,
  generateAppointmentBriefHTML,
  generateHealthConsultBriefHTML,
  generateSleepConsultBriefHTML,
} from "../src/brief.js";
import { addDaily, addNight, daysBack, emptyData, steadyData } from "./helpers/data.js";

async function sampleSummary(profile, days = 30) {
  const xml = buildSampleExportXml({ profile, days: days * 2 + 10 });
  const data = await parseHealthExportXml(xml, { days: days * 2 + 2, heartRate: false });
  return buildPeriodSummary(data, { days });
}

test("short sleep leads the brief even when steps are also light", async () => {
  const model = buildBriefModel(await sampleSummary("short_sleep"));
  assert.equal(model.focus, "sleep");
  assert.equal(model.headline, "Sleep is the clearest place to look this month.");
  assert.equal(model.question, "Which input is shaping your sleep the most?");
});

test("when sleep and steps both fall short, sleep comes first", () => {
  const model = buildBriefModel(buildPeriodSummary(steadyData({ sleepMinutes: 360, steps: 3500 }), { days: 30 }));
  assert.equal(model.focus, "sleep");
});

test("light movement leads when sleep is fine", () => {
  const model = buildBriefModel(buildPeriodSummary(steadyData({ steps: 3800 }), { days: 30 }));
  assert.equal(model.focus, "activity");
  assert.match(model.patterns[0], /^Your daily steps averaged around 3,800 steps/);
});

test("the sleep brief stays on sleep and recovery", () => {
  const model = buildBriefModel(buildPeriodSummary(steadyData({ steps: 2000, protein: 40 }), { days: 30 }), { mode: "sleep" });
  assert.equal(model.focus, "sleep");
  assert.deepEqual(model.coverage, ["Sleep 30/30", "Recovery 30/30"]);
  assert.ok(model.evidence.every((row) => !/Steps|Protein/.test(row.metric)));
});

test("evidence compares the last 7 days with the period", () => {
  const data = emptyData();
  for (const [index, day] of daysBack(30).entries()) {
    addNight(data, day, { deep: 60, rem: 90, core: index >= 23 ? 330 : 270 });
  }
  const model = buildBriefModel(buildPeriodSummary(data, { days: 30 }));
  const sleepRow = model.evidence.find((row) => row.metric === "Sleep duration");
  assert.equal(sleepRow.latest, "8h 00m");
  assert.equal(sleepRow.baseline, "7h 14m");
  assert.equal(sleepRow.direction, "up");
});

test("nutrition only shows up when food was logged", () => {
  const without = buildBriefModel(buildPeriodSummary(steadyData(), { days: 30 }));
  assert.ok(!without.coverage.some((part) => part.startsWith("Nutrition")));
  const withFood = buildBriefModel(buildPeriodSummary(steadyData({ protein: 120 }), { days: 30 }));
  assert.ok(withFood.coverage.includes("Nutrition 30/30"));
});

test("a year brief suggests a longer horizon", () => {
  const data = emptyData();
  for (const day of daysBack(400)) {
    addNight(data, day, {});
    addDaily(data, "steps", day, 8000);
  }
  const model = buildBriefModel(buildPeriodSummary(data, { days: 365 }));
  assert.equal(model.experiment, "Sleep looks like the area to focus on next. Worth tracking as the months go.");
});

test("the HTML has the app's sections and no verdicts or em dashes", async () => {
  for (const profile of ["steady", "short_sleep", "mover"]) {
    const summary = await sampleSummary(profile);
    for (const make of [generateHealthConsultBriefHTML, generateSleepConsultBriefHTML]) {
      const { html, filename } = make(summary, { generatedAt: new Date("2026-10-25T12:00:00Z") });
      const text = html.replace(/<style[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ");
      for (const heading of ["The question worth asking", "Strongest patterns", "Evidence", "Worth bringing up", "What to test next"]) {
        assert.ok(text.includes(heading), `${profile}: ${heading}`);
      }
      assert.match(text, /not a diagnosis/);
      assert.doesNotMatch(text, /—/, profile);
      assert.doesNotMatch(text, /\bpoor\b|needs attention|take it easy|\blow\)|\btonight\b/i, profile);
      assert.match(filename, /^aveil-(health|sleep)-brief-2026-10-25\.html$/);
    }
  }
});

test("too little data gives a calm empty brief", () => {
  const { html } = generateHealthConsultBriefHTML(buildPeriodSummary(emptyData(), { days: 30 }));
  assert.match(html, /There is not enough tracked data in this window for a brief yet/);
});

test("the old name still works", () => {
  assert.equal(generateAppointmentBriefHTML, generateHealthConsultBriefHTML);
});
