/**
 * Health analysis engine — deterministic signals from parsed Apple Health data.
 * Ports the core logic from health-api signals endpoint.
 */

/**
 * Run full analysis on parsed health data.
 * @param {HealthData} data - Output from parseHealthExport
 * @returns {AnalysisReport}
 */
export function analyze(data) {
  const sleepAnalysis = analyzeSleep(data.sleep, data.heartRate, data.hrv);
  const activityAnalysis = analyzeActivity(data.steps, data.activeEnergy, data.workouts);
  const recoveryAnalysis = analyzeRecovery(data.hrv, data.restingHR, sleepAnalysis);
  const nutritionAnalysis = analyzeNutrition(data.dietaryEnergy, data.dietaryProtein);
  const overall = computeOverallScore(sleepAnalysis, activityAnalysis, recoveryAnalysis, nutritionAnalysis);

  return {
    exportDate: data.exportDate,
    profile: data.profile,
    recordCount: data.recordCount,
    overall,
    sleep: sleepAnalysis,
    activity: activityAnalysis,
    recovery: recoveryAnalysis,
    nutrition: nutritionAnalysis,
    signals: generateSignals(sleepAnalysis, activityAnalysis, recoveryAnalysis, nutritionAnalysis),
    recommendations: generateRecommendations(sleepAnalysis, activityAnalysis, recoveryAnalysis, nutritionAnalysis),
  };
}

// ─── Sleep ───

function analyzeSleep(sleepRecords, heartRateRecords, hrvRecords) {
  if (!sleepRecords.length) return { available: false };

  // Group sleep by night (use start date, group by calendar date of wake)
  const nights = groupSleepByNight(sleepRecords);
  const recentNights = nights.slice(-14); // last 14 nights
  const lastNight = nights[nights.length - 1];

  const durations = recentNights.map((n) => n.totalMinutes);
  const avgDuration = mean(durations);

  // Stage breakdown
  const stageStats = recentNights.map((n) => ({
    deep: n.deepMinutes,
    rem: n.remMinutes,
    core: n.coreMinutes,
    awake: n.awakeMinutes,
    total: n.totalMinutes,
  }));

  const avgDeep = mean(stageStats.map((s) => s.deep).filter((v) => v > 0));
  const avgRem = mean(stageStats.map((s) => s.rem).filter((v) => v > 0));

  // Sleep timing
  const bedtimes = recentNights
    .map((n) => {
      const d = new Date(n.sleepStart);
      let hour = d.getHours() + d.getMinutes() / 60;
      if (hour < 12) hour += 24; // normalize past midnight
      return hour;
    })
    .filter((h) => !isNaN(h));
  const avgBedtime = mean(bedtimes);
  const bedtimeVariability = stddev(bedtimes);

  return {
    available: true,
    nightsAnalyzed: recentNights.length,
    lastNight: lastNight
      ? {
          date: lastNight.date,
          totalMinutes: lastNight.totalMinutes,
          deepMinutes: lastNight.deepMinutes,
          remMinutes: lastNight.remMinutes,
          coreMinutes: lastNight.coreMinutes,
          awakeMinutes: lastNight.awakeMinutes,
          sleepStart: lastNight.sleepStart,
          sleepEnd: lastNight.sleepEnd,
        }
      : null,
    averages: {
      durationMinutes: round(avgDuration),
      deepMinutes: round(avgDeep),
      remMinutes: round(avgRem),
      bedtimeHour: round(avgBedtime, 1),
      bedtimeVariability: round(bedtimeVariability, 2),
    },
    trend: durations.length >= 7 ? trendDirection(durations) : "insufficient_data",
  };
}

function groupSleepByNight(records) {
  // Apple Health sleep values:
  // HKCategoryValueSleepAnalysisInBed
  // HKCategoryValueSleepAnalysisAsleepCore
  // HKCategoryValueSleepAnalysisAsleepDeep
  // HKCategoryValueSleepAnalysisAsleepREM
  // HKCategoryValueSleepAnalysisAwake
  // HKCategoryValueSleepAnalysisAsleepUnspecified

  const ASLEEP_TYPES = new Set([
    "HKCategoryValueSleepAnalysisAsleepCore",
    "HKCategoryValueSleepAnalysisAsleepDeep",
    "HKCategoryValueSleepAnalysisAsleepREM",
    "HKCategoryValueSleepAnalysisAsleepUnspecified",
  ]);

  // Group by "night" — use end date's calendar date as the night key
  const nightMap = new Map();

  for (const r of records) {
    const end = new Date(r.end);
    const start = new Date(r.start);
    // Night key: the date you wake up
    const nightKey = end.toISOString().slice(0, 10);

    if (!nightMap.has(nightKey)) {
      nightMap.set(nightKey, { segments: [], sleepStart: null, sleepEnd: null });
    }
    const night = nightMap.get(nightKey);
    night.segments.push({ ...r, startDate: start, endDate: end });
    if (!night.sleepStart || start < new Date(night.sleepStart)) night.sleepStart = r.start;
    if (!night.sleepEnd || end > new Date(night.sleepEnd)) night.sleepEnd = r.end;
  }

  const nights = [];
  for (const [date, night] of nightMap) {
    let deep = 0, rem = 0, core = 0, awake = 0, total = 0;

    for (const seg of night.segments) {
      const mins = (seg.endDate - seg.startDate) / 60000;
      if (seg.value === "HKCategoryValueSleepAnalysisAsleepDeep") deep += mins;
      else if (seg.value === "HKCategoryValueSleepAnalysisAsleepREM") rem += mins;
      else if (seg.value === "HKCategoryValueSleepAnalysisAsleepCore") core += mins;
      else if (seg.value === "HKCategoryValueSleepAnalysisAwake") awake += mins;
      else if (seg.value === "HKCategoryValueSleepAnalysisAsleepUnspecified") core += mins;

      if (ASLEEP_TYPES.has(seg.value)) total += mins;
    }

    nights.push({
      date,
      totalMinutes: round(total),
      deepMinutes: round(deep),
      remMinutes: round(rem),
      coreMinutes: round(core),
      awakeMinutes: round(awake),
      sleepStart: night.sleepStart,
      sleepEnd: night.sleepEnd,
    });
  }

  return nights.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Activity ───

function analyzeActivity(steps, activeEnergy, workouts) {
  if (!steps.length && !workouts.length) return { available: false };

  const dailySteps = aggregateByDay(steps);
  const dailyEnergy = aggregateByDay(activeEnergy);
  const recentDays = Object.keys(dailySteps).sort().slice(-14);

  const stepValues = recentDays.map((d) => dailySteps[d] || 0);
  const energyValues = recentDays.map((d) => dailyEnergy[d] || 0);

  const recentWorkouts = workouts.slice(-20);

  return {
    available: true,
    daysAnalyzed: recentDays.length,
    averages: {
      stepsPerDay: round(mean(stepValues)),
      activeEnergyPerDay: round(mean(energyValues)),
    },
    lastDay: recentDays.length
      ? {
          date: recentDays[recentDays.length - 1],
          steps: round(stepValues[stepValues.length - 1]),
          activeEnergy: round(energyValues[energyValues.length - 1]),
        }
      : null,
    recentWorkouts: recentWorkouts.map((w) => ({
      type: w.type,
      duration: round(w.duration),
      energy: round(w.totalEnergy),
      date: w.start,
    })),
    trend: stepValues.length >= 7 ? trendDirection(stepValues) : "insufficient_data",
  };
}

// ─── Recovery ───

function analyzeRecovery(hrvRecords, restingHRRecords, sleepAnalysis) {
  if (!hrvRecords.length) return { available: false };

  const dailyHRV = aggregateByDay(hrvRecords, "mean");
  const dailyRHR = aggregateByDay(restingHRRecords, "mean");

  const recentDays = Object.keys(dailyHRV).sort().slice(-14);
  const hrvValues = recentDays.map((d) => dailyHRV[d]);
  const rhrValues = recentDays.map((d) => dailyRHR[d]).filter(Boolean);

  const avgHRV = mean(hrvValues);
  const latestHRV = hrvValues[hrvValues.length - 1];
  const avgRHR = rhrValues.length ? mean(rhrValues) : null;

  // Recovery score: simple model based on HRV relative to personal baseline
  const hrvZ = avgHRV > 0 ? (latestHRV - avgHRV) / (stddev(hrvValues) || 1) : 0;
  const sleepFactor = sleepAnalysis.available && sleepAnalysis.lastNight
    ? Math.min(sleepAnalysis.lastNight.totalMinutes / 420, 1.2)  // 7h = 1.0
    : 0.85;

  const recoveryScore = Math.max(0, Math.min(100, round(60 + hrvZ * 15 + (sleepFactor - 1) * 30)));

  return {
    available: true,
    daysAnalyzed: recentDays.length,
    latestHRV: round(latestHRV, 1),
    averageHRV: round(avgHRV, 1),
    averageRHR: avgRHR ? round(avgRHR) : null,
    recoveryScore,
    readiness: recoveryScore >= 70 ? "good" : recoveryScore >= 50 ? "moderate" : "low",
    trend: hrvValues.length >= 7 ? trendDirection(hrvValues) : "insufficient_data",
  };
}

// ─── Nutrition ───

function analyzeNutrition(dietaryEnergy, dietaryProtein) {
  if (!dietaryEnergy.length && !dietaryProtein.length) {
    return { available: false, note: "No dietary data found in Apple Health export." };
  }

  const dailyCals = aggregateByDay(dietaryEnergy);
  const dailyProtein = aggregateByDay(dietaryProtein);
  const recentDays = Object.keys(dailyCals).sort().slice(-14);

  return {
    available: true,
    daysTracked: recentDays.length,
    averages: {
      caloriesPerDay: round(mean(recentDays.map((d) => dailyCals[d] || 0))),
      proteinPerDay: round(mean(recentDays.map((d) => dailyProtein[d] || 0))),
    },
  };
}

// ─── Signals ───

function generateSignals(sleep, activity, recovery, nutrition) {
  const signals = [];

  if (sleep.available && sleep.lastNight) {
    const ln = sleep.lastNight;
    const totalHrs = (ln.totalMinutes / 60).toFixed(1);
    const quality = ln.totalMinutes >= 420 ? (ln.deepMinutes >= 45 ? "good" : "fair") : "poor";

    signals.push({
      type: "sleep_quality",
      level: quality === "good" ? "positive" : quality === "fair" ? "neutral" : "warning",
      title: `Sleep: ${totalHrs}h (${quality})`,
      detail: `Deep ${ln.deepMinutes}m · REM ${ln.remMinutes}m · Core ${ln.coreMinutes}m`,
      moves: quality === "poor"
        ? ["Prioritize 7+ hours tonight", "Consider earlier bedtime"]
        : quality === "fair"
        ? ["Deep sleep is below target — reduce late caffeine/alcohol"]
        : ["Sleep looks solid — maintain current routine"],
    });

    // Deep sleep deficit
    if (sleep.averages.deepMinutes < 45) {
      signals.push({
        type: "deep_sleep_deficit",
        level: "warning",
        title: `Deep sleep averaging ${sleep.averages.deepMinutes}m (target: 45+)`,
        detail: `14-night average. Low deep sleep impacts recovery, memory, and hormones.`,
        moves: ["Cool room to 65-68°F", "Avoid alcohol within 3h of bed", "Consistent bedtime ±30min"],
      });
    }
  }

  if (recovery.available) {
    signals.push({
      type: "recovery_readiness",
      level: recovery.readiness === "good" ? "positive" : recovery.readiness === "moderate" ? "neutral" : "warning",
      title: `Recovery: ${recovery.recoveryScore}/100 (${recovery.readiness})`,
      detail: `HRV ${recovery.latestHRV}ms (avg ${recovery.averageHRV}ms)${recovery.averageRHR ? ` · RHR ${recovery.averageRHR}bpm` : ""}`,
      moves: recovery.readiness === "low"
        ? ["Take it easy today — low-intensity activity only", "Prioritize sleep tonight"]
        : recovery.readiness === "moderate"
        ? ["Moderate training OK — skip maximal efforts"]
        : ["Good to push — recovery supports hard training today"],
    });
  }

  if (activity.available && activity.averages.stepsPerDay < 6000) {
    signals.push({
      type: "activity_low",
      level: "neutral",
      title: `Steps averaging ${activity.averages.stepsPerDay}/day`,
      detail: "Below 6,000 steps/day threshold for baseline health benefits.",
      moves: ["Add a 15-min walk after meals", "Standing breaks every hour"],
    });
  }

  if (nutrition.available && nutrition.averages.proteinPerDay > 0 && nutrition.averages.proteinPerDay < 100) {
    signals.push({
      type: "protein_lag",
      level: "neutral",
      title: `Protein averaging ${nutrition.averages.proteinPerDay}g/day`,
      detail: "Below recommended 1.6g/kg for active individuals.",
      moves: ["Add a protein source to each meal", "Consider a protein shake post-workout"],
    });
  }

  if (!signals.length) {
    signals.push({
      type: "all_clear",
      level: "positive",
      title: "All systems nominal",
      detail: "No actionable signals detected. Keep doing what you're doing.",
      moves: [],
    });
  }

  return signals;
}

// ─── Overall Score ───

function computeOverallScore(sleep, activity, recovery, nutrition) {
  let score = 70; // baseline
  let components = [];

  if (sleep.available && sleep.lastNight) {
    const sleepScore = Math.min(100, (sleep.lastNight.totalMinutes / 480) * 100);
    const deepBonus = sleep.lastNight.deepMinutes >= 45 ? 10 : sleep.lastNight.deepMinutes >= 30 ? 5 : -5;
    score = sleepScore * 0.4 + score * 0.6 + deepBonus;
    components.push({ name: "sleep", score: round(sleepScore + deepBonus) });
  }

  if (recovery.available) {
    score = score * 0.7 + recovery.recoveryScore * 0.3;
    components.push({ name: "recovery", score: recovery.recoveryScore });
  }

  if (activity.available) {
    const actScore = Math.min(100, (activity.averages.stepsPerDay / 10000) * 100);
    score = score * 0.85 + actScore * 0.15;
    components.push({ name: "activity", score: round(actScore) });
  }

  return { score: round(Math.max(0, Math.min(100, score))), components };
}

// ─── Helpers ───

function aggregateByDay(records, mode = "sum") {
  const days = {};
  for (const r of records) {
    const day = (r.start || "").slice(0, 10);
    if (!day) continue;
    if (!days[day]) days[day] = [];
    days[day].push(r.value);
  }

  const result = {};
  for (const [day, vals] of Object.entries(days)) {
    result[day] = mode === "mean" ? mean(vals) : vals.reduce((a, b) => a + b, 0);
  }
  return result;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
}

function trendDirection(values) {
  if (values.length < 4) return "insufficient_data";
  const first = mean(values.slice(0, Math.floor(values.length / 2)));
  const second = mean(values.slice(Math.floor(values.length / 2)));
  const pctChange = ((second - first) / (first || 1)) * 100;
  if (pctChange > 5) return "improving";
  if (pctChange < -5) return "declining";
  return "stable";
}

function round(v, decimals = 0) {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

// ─── Recommendations (time-aware) ───

function generateRecommendations(sleep, activity, recovery, nutrition) {
  const now = new Date();
  const hour = now.getHours();
  const recs = [];

  // ── Morning (5-10): Day planning based on recovery ──
  if (hour >= 5 && hour < 10) {
    if (recovery.available && recovery.readiness === "good") {
      recs.push({
        type: "morning_push",
        timing: "morning",
        priority: "high",
        title: "High recovery — prioritize deep work",
        detail: `Recovery score ${recovery.recoveryScore}/100 and HRV ${recovery.latestHRV}ms. Your body is ready. Use this morning for your hardest cognitive or physical work.`,
      });
    } else if (recovery.available && recovery.readiness === "low") {
      recs.push({
        type: "morning_rest",
        timing: "morning",
        priority: "high",
        title: "Low recovery — lighter day recommended",
        detail: `Recovery score ${recovery.recoveryScore}/100. Consider skipping intense training, focusing on maintenance tasks, and getting to bed early tonight.`,
      });
    }

    // Sleep debt warning
    if (sleep.available && sleep.averages && sleep.averages.durationMinutes < 390) {
      recs.push({
        type: "sleep_debt",
        timing: "morning",
        priority: "high",
        title: "Accumulated sleep debt detected",
        detail: `Averaging ${(sleep.averages.durationMinutes / 60).toFixed(1)}h — below 6.5h target minimum. Cognitive performance and self-control are likely impaired. Consider a recovery day with early bedtime.`,
      });
    }
  }

  // ── Midday (10-14): Activity + nutrition nudges ──
  if (hour >= 10 && hour < 14) {
    if (activity.available && activity.lastDay && activity.lastDay.steps < 3000) {
      recs.push({
        type: "midday_movement",
        timing: "midday",
        priority: "medium",
        title: "Low movement so far — take a walk",
        detail: `Only ${activity.lastDay.steps.toLocaleString()} steps today. A short walk now improves focus and energy for the afternoon.`,
      });
    }
  }

  // ── Afternoon (14-17): Drift risk + movement ──
  if (hour >= 14 && hour < 17) {
    if (recovery.available && recovery.readiness !== "good") {
      recs.push({
        type: "afternoon_protect",
        timing: "afternoon",
        priority: "medium",
        title: "Afternoon energy dip likely",
        detail: `Recovery is ${recovery.readiness}. Common drift window — try a walking break, avoid sugar/caffeine crash, or switch to lighter tasks.`,
      });
    }
  }

  // ── Evening (17-21): Bedtime preparation ──
  if (hour >= 17 && hour < 21 && sleep.available && sleep.averages) {
    const avgBedtime = sleep.averages.bedtimeHour;
    const normalizedBedtime = avgBedtime >= 24 ? avgBedtime - 24 : avgBedtime;
    const hoursUntilBed = normalizedBedtime - hour + (normalizedBedtime < hour ? 24 : 0);

    if (hoursUntilBed <= 2 && hoursUntilBed > 0) {
      recs.push({
        type: "bedtime_approaching",
        timing: "evening",
        priority: "high",
        title: "Bedtime in ~" + Math.round(hoursUntilBed) + "h",
        detail: `Your average bedtime is ${formatHourSimple(avgBedtime)}. Start winding down — dim lights, avoid screens, no heavy meals or caffeine.`,
      });
    }

    // Bedtime consistency nudge
    if (sleep.averages.bedtimeVariability > 1.0) {
      recs.push({
        type: "bedtime_consistency",
        timing: "evening",
        priority: "medium",
        title: "Inconsistent bedtime pattern",
        detail: `Your bedtime varies by ±${(sleep.averages.bedtimeVariability * 60).toFixed(0)} minutes. Consistent sleep/wake times improve deep sleep and circadian alignment.`,
      });
    }
  }

  // ── Night (21-5): Wind down / recovery ──
  if (hour >= 21 || hour < 5) {
    if (sleep.available && sleep.lastNight && sleep.lastNight.deepMinutes < 30) {
      recs.push({
        type: "deep_sleep_priority",
        timing: "night",
        priority: "medium",
        title: "Protect deep sleep tonight",
        detail: `Last night's deep sleep was only ${sleep.lastNight.deepMinutes}m. Cool room (65-68°F), no alcohol, no late heavy meals.`,
      });
    }
  }

  // ── Anytime: Training guidance based on recovery ──
  if (recovery.available) {
    if (recovery.readiness === "good" && recovery.trend === "improving") {
      recs.push({
        type: "training_green",
        timing: "anytime",
        priority: "low",
        title: "Recovery trending up — good stretch to push",
        detail: `HRV trending upward (${recovery.trend}) with current score ${recovery.recoveryScore}/100. Your body is adapting well — safe to increase training load.`,
      });
    } else if (recovery.readiness === "low" && recovery.trend === "declining") {
      recs.push({
        type: "training_red",
        timing: "anytime",
        priority: "high",
        title: "Recovery declining — rest day recommended",
        detail: `HRV trending down with recovery at ${recovery.recoveryScore}/100. Pushing through this increases injury and illness risk. Take a rest day.`,
      });
    }
  }

  // Sort by priority
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  recs.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));

  return recs;
}

function formatHourSimple(h) {
  if (isNaN(h)) return "--:--";
  const norm = h >= 24 ? h - 24 : h;
  const hrs = Math.floor(norm);
  const mins = Math.round((norm - hrs) * 60);
  const period = hrs >= 12 ? "PM" : "AM";
  const display = hrs > 12 ? hrs - 12 : hrs || 12;
  return `${display}:${mins.toString().padStart(2, "0")} ${period}`;
}
