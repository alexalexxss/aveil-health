import test from "node:test";
import assert from "node:assert/strict";

import { generateAppointmentBriefHTML } from "./brief.js";

test("generateAppointmentBriefHTML renders an appointment-ready brief", () => {
  const report = {
    overall: {
      score: 74,
      components: [
        { name: "sleep", score: 79 },
        { name: "recovery", score: 71 },
        { name: "activity", score: 68 },
      ],
    },
    sleep: {
      available: true,
      trend: "declining",
      lastNight: {
        totalMinutes: 392,
        deepMinutes: 32,
        remMinutes: 79,
        coreMinutes: 281,
        awakeMinutes: 24,
        sleepStart: "2026-04-05T22:18:00.000Z",
      },
      averages: {
        durationMinutes: 405,
        deepMinutes: 38,
        remMinutes: 84,
        bedtimeHour: 22.4,
        bedtimeVariability: 0.9,
      },
    },
    recovery: {
      available: true,
      trend: "stable",
      latestHRV: 58,
      averageHRV: 61,
      averageRHR: 57,
      recoveryScore: 66,
    },
    activity: {
      available: true,
      trend: "improving",
      lastDay: {
        steps: 8420,
        activeEnergy: 512,
      },
      averages: {
        stepsPerDay: 9015,
        activeEnergyPerDay: 548,
      },
      recentWorkouts: [
        { type: "StrengthTraining", duration: 42 },
        { type: "Walking", duration: 31 },
      ],
    },
    nutrition: {
      available: true,
      averages: {
        proteinPerDay: 118,
      },
    },
    signals: [
      {
        type: "deep_sleep_deficit",
        level: "warning",
        title: "Deep sleep averaging 38m (target: 45+)",
        detail: "Low deep sleep impacts recovery, memory, and hormones.",
        moves: ["Cool room to 65-68°F"],
      },
      {
        type: "recovery_readiness",
        level: "neutral",
        title: "Recovery: 66/100 (moderate)",
        detail: "HRV is close to baseline, but not clearly strong.",
        moves: ["Adjust training intensity to match recovery"],
      },
      {
        type: "sleep_quality",
        level: "warning",
        title: "Sleep: 6.5h (fair)",
        detail: "Deep 32m · REM 79m · Core 281m",
        moves: ["Prioritize 7+ hours tonight"],
      },
      {
        type: "protein_low",
        level: "positive",
        title: "Protein averaging 118g/day",
        detail: "Protein intake is strong enough to support recovery for many people.",
        moves: ["Keep the current protein floor"],
      },
    ],
    recommendations: [],
  };

  const { html, filename } = generateAppointmentBriefHTML(report, { days: 30 });

  assert.match(filename, /^aveil-brief-\d{4}-\d{2}-\d{2}\.html$/);
  assert.match(html, /Aveil appointment-ready health brief/);
  assert.match(html, /Key metrics/);
  assert.match(html, /Priority findings/);
  assert.match(html, /Questions to discuss/);
  assert.match(html, /Deep sleep averaging 38m \(target: 45\+\)/);
  assert.match(html, /Protein averaging 118g\/day/);
});
