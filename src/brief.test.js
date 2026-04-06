import test from "node:test";
import assert from "node:assert/strict";

import {
  generateAppointmentBriefHTML,
  generateHealthConsultBriefHTML,
  generateSleepConsultBriefHTML,
} from "./brief.js";

test("generic brief chooses the strongest cross-domain issue instead of defaulting to sleep", () => {
  const report = {
    overall: { score: 74, components: [{ name: "activity", score: 58 }] },
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
      readiness: "good",
    },
    activity: {
      available: true,
      averages: {
        stepsPerDay: 4820,
        activeEnergyPerDay: 251,
      },
      lastDay: {
        steps: 4100,
        activeEnergy: 220,
      },
      recentWorkouts: [{ type: "Walk", duration: 28 }],
    },
    nutrition: {
      available: true,
      averages: {
        caloriesPerDay: 1680,
        proteinPerDay: 132,
      },
      lastDay: {
        calories: 1705,
        protein: 128,
      },
    },
    signals: [
      {
        type: "sleep_quality",
        level: "positive",
        title: "Sleep: 7.2h (good)",
        detail: "Deep 87m · REM 111m · Core 231m",
        moves: ["Preserve the routine before changing variables."],
      },
      {
        type: "recovery_readiness",
        level: "positive",
        title: "Recovery: ready",
        detail: "HRV 120ms · Resting HR 54bpm",
        moves: ["Training and recovery look compatible."],
      },
      {
        type: "activity_low",
        level: "neutral",
        title: "Steps: 4.8k/day",
        detail: "Activity base is light · 1 recent workout",
        moves: ["Add one extra walk or short session to raise the weekly floor."],
      },
    ],
  };

  const { html, filename } = generateHealthConsultBriefHTML(report, {
    generatedAt: "2026-04-06T12:00:00.000Z",
    days: 30,
  });

  assert.equal(filename, "aveil-health-consult-brief-2026-04-06.html");
  assert.match(html, /The clearest current health consult issue is steps: 4\.8k\/day/i);
  assert.match(html, /Top signal: Steps: 4\.8k\/day\./);
  assert.match(html, /Daily steps/);
  assert.match(html, /protein/);
  assert.doesNotMatch(html, /The clearest sleep\/recovery anomaly/i);
});

test("generic brief uses truthful no-acute-anomaly framing when the top signal is positive", () => {
  const report = {
    overall: { score: 84, components: [{ name: "recovery", score: 82 }] },
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
      readiness: "good",
    },
    activity: {
      available: true,
      averages: {
        stepsPerDay: 12076,
        activeEnergyPerDay: 783,
      },
      recentWorkouts: [{}, {}, {}],
    },
    nutrition: {
      available: true,
      averages: {
        caloriesPerDay: 1676,
        proteinPerDay: 132,
      },
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
  assert.match(html, /Other signals look stable/);
  assert.match(html, /daily steps/);
  assert.match(html, /protein/);
  assert.doesNotMatch(html, /The clearest current health consult issue/i);
});

test("sleep brief preserves the narrow sleep\/recovery wedge", () => {
  const report = {
    overall: { score: 69, components: [{ name: "sleep", score: 58 }] },
    sleep: {
      available: true,
      trend: "declining",
      lastNight: {
        totalMinutes: 362,
        deepMinutes: 52,
        remMinutes: 68,
        sleepStart: "2026-04-05T23:58:00.000Z",
      },
      averages: {
        durationMinutes: 412,
        deepMinutes: 67,
        remMinutes: 81,
        bedtimeHour: 23.9,
        bedtimeVariability: 1.4,
      },
    },
    recovery: {
      available: true,
      trend: "declining",
      latestHRV: 51,
      averageHRV: 63,
      averageRHR: 58,
      recoveryScore: 61,
      readiness: "moderate",
    },
    activity: {
      available: true,
      averages: {
        stepsPerDay: 4820,
        activeEnergyPerDay: 251,
      },
      recentWorkouts: [{ type: "Walk", duration: 28 }],
    },
    nutrition: {
      available: true,
      averages: {
        caloriesPerDay: 1680,
        proteinPerDay: 132,
      },
    },
    signals: [
      {
        type: "activity_low",
        level: "neutral",
        title: "Steps: 4.8k/day",
        detail: "Activity base is light · 1 recent workout",
        moves: ["Add one extra walk or short session to raise the weekly floor."],
      },
      {
        type: "sleep_debt",
        level: "warning",
        title: "Sleep duration is below target",
        detail: "Average sleep has slipped below the recent baseline while recovery is only moderate.",
        moves: ["Protect sleep timing for the next 7 days."],
      },
    ],
  };

  const { html, filename } = generateSleepConsultBriefHTML(report, {
    generatedAt: "2026-04-06T12:00:00.000Z",
    days: 30,
  });

  assert.equal(filename, "aveil-sleep-recovery-brief-2026-04-06.html");
  assert.match(html, /The clearest sleep\/recovery anomaly right now is sleep duration is below target/i);
  assert.match(html, /Sleep and recovery evidence/);
  assert.doesNotMatch(html, /The clearest current health consult issue is steps: 4\.8k\/day/i);
});
