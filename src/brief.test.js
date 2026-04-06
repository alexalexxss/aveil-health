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
  assert.match(html, /The clearest sleep\/recovery anomaly right now is sleep duration is below target/i);
  assert.match(html, /Top signal: Sleep duration is below target\./);
  assert.doesNotMatch(html, /doctor, coach, or self-review/i);
  assert.doesNotMatch(html, /Overall score/i);
});

test("generateAppointmentBriefHTML uses truthful fallback when the top signal is positive", () => {
  const report = {
    overall: {
      score: 84,
      components: [
        { name: "recovery", score: 82 },
      ],
    },
    sleep: {
      available: true,
      trend: "stable",
      lastNight: {
        totalMinutes: 430,
        deepMinutes: 87,
        remMinutes: 111,
        sleepStart: "2026-04-05T23:18:00.000Z",
      },
      averages: {
        durationMinutes: 429,
        deepMinutes: 86,
        remMinutes: 109,
        bedtimeHour: 23.3,
        bedtimeVariability: 0.4,
      },
    },
    recovery: {
      available: true,
      trend: "improving",
      latestHRV: 120,
      averageHRV: 111,
      averageRHR: 54,
      recoveryScore: 86,
    },
    signals: [
      {
        type: "sleep_quality",
        level: "positive",
        title: "Sleep: 7.2h (good)",
        detail: "Deep 87m · REM 111m · Core 231m",
        moves: ["Sleep looks solid, so preserve the routine before changing variables."],
      },
    ],
  };

  const { html } = generateAppointmentBriefHTML(report, {
    generatedAt: "2026-04-06T12:00:00.000Z",
    days: 30,
  });

  assert.match(html, /No acute anomaly\./);
  assert.match(html, /Top signal: Sleep: 7\.2h \(good\)\./);
  assert.doesNotMatch(html, /The clearest sleep\/recovery anomaly/i);
});
