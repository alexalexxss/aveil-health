import test from "node:test";
import assert from "node:assert/strict";

import { generateAppointmentBriefHTML } from "./brief.js";

test("generateAppointmentBriefHTML renders anomaly-first sleep/recovery consult copy", () => {
  const report = {
    overall: {
      score: 72,
      components: [
        { name: "recovery", score: 68 },
      ],
    },
    sleep: {
      available: true,
      trend: "declining",
      lastNight: {
        totalMinutes: 386,
        deepMinutes: 58,
        remMinutes: 71,
        sleepStart: "2026-04-05T23:18:00.000Z",
      },
      averages: {
        durationMinutes: 421,
        deepMinutes: 69,
        remMinutes: 85,
        bedtimeHour: 23.6,
        bedtimeVariability: 1.2,
      },
    },
    recovery: {
      available: true,
      trend: "declining",
      latestHRV: 49,
      averageHRV: 61,
      averageRHR: 58,
      recoveryScore: 63,
    },
    signals: [
      {
        type: "sleep_debt",
        level: "warning",
        title: "Sleep duration is below target",
        detail: "Average sleep has slipped below the recent baseline while recovery is only moderate.",
        moves: ["Protect sleep timing for the next 7 days."],
      },
      {
        type: "recovery_low",
        level: "warning",
        title: "Recovery is softer than baseline",
        detail: "HRV is lower than the recent average and the recovery trend is declining.",
        moves: ["Reduce recovery noise and re-check HRV next week."],
      },
    ],
  };

  const { html, filename } = generateAppointmentBriefHTML(report, {
    generatedAt: "2026-04-06T12:00:00.000Z",
    days: 30,
  });

  assert.equal(filename, "aveil-sleep-recovery-brief-2026-04-06.html");
  assert.match(html, /Aveil sleep & recovery consult brief/);
  assert.match(html, /What changed/);
  assert.match(html, /Why it matters/);
  assert.match(html, /What to ask/);
  assert.match(html, /What to test next/);
  assert.match(html, /Sleep duration is the clearest anomaly/);
  assert.doesNotMatch(html, /doctor, coach, or self-review/i);
  assert.doesNotMatch(html, /Overall score/i);
});
