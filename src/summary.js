/**
 * Period summary for the Wrapped card and the health brief.
 *
 * Everything here is a simple, standard measure: daily totals, averages,
 * the last 7 days against the whole period, this period against the one
 * before it, sleep stages, and a few common reference marks (for example
 * 7,000 steps a day or 60 minutes of deep sleep). The one comparison with
 * other people is the age-based recovery band, rounded to top ~5, 10, or 25%.
 * The README describes every rule.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MAIN_SLEEP_MINUTES = 180;
const SESSION_GAP_MINUTES = 120;
const STEADY_BAND = 0.03;

// Common reference marks. These are not population percentiles.
export const MARKS = {
  sleepMinutes: 420,          // 7 hours
  deepStrongMinutes: 60,
  deepLowMinutes: 45,
  remStrongMinutes: 90,
  stepsStrong: 7000,
  stepsLow: 5000,
  hrvStrongMs: 55,
  restingHrStrongBpm: 55,
  restingHrMarkBpm: 60,
  bedtimeSteadyMinutes: 30,
  bedtimeDriftMinutes: 60,
  proteinStrongGrams: 100,
  proteinLowGrams: 75,
};

// Achievement tags shown on Wrapped facts: [fair, strong, elite].
// Counts are per 7 days so week, month, and year cards use one standard.
const TIER_BANDS = {
  steps: [6000, 8000, 15000],
  sleepMinutes: [390, 450, null],
  deepMinutes: [60, 75, null],
  remMinutes: [60, 90, null],
  hrv: [35, 55, null],
  protein: [75, 100, null],
  workoutsPerWeek: [1, 3, 5],
  strengthPerWeek: [1, 2, 3],
};

// The smallest change that counts as a real move between two periods.
const MEANINGFUL_CHANGE = {
  sleepMinutes: 15,
  deepMinutes: 10,
  remMinutes: 10,
  steps: 1000,
  hrv: 5,
  restingHR: 2,
};

const STRENGTH_TYPES = new Set(["TraditionalStrengthTraining", "FunctionalStrengthTraining", "CoreTraining"]);

// Published wearable-population norms by age band, (max age, mean, sd): the
// same tables the Aveil app uses for its "Top ~X% recovery" line. Apple Watch
// HRV is SDNN, so it is only ever compared with SDNN norms.
const HRV_SDNN_NORMS = [[29, 68, 24], [39, 56, 21], [49, 47, 18], [59, 41, 16], [200, 36, 15]];
const RESTING_HR_NORMS = [[29, 66, 9], [39, 67, 9], [49, 68, 9], [59, 68, 9], [200, 68, 9]];
const RESTING_HR_FEMALE_OFFSET = 3;
const BAND_MIN_DAYS = 10;

/**
 * Build the summary for the last `days` complete days of an export.
 * @param {object} data - output of parseHealthExport, read with at least 2 × days of history
 * @param {object} [options]
 * @param {number} [options.days=30]
 * @param {string} [options.endDate] - last day to include (YYYY-MM-DD); defaults to the last complete day of the export
 */
export function buildPeriodSummary(data, options = {}) {
  const days = Math.max(1, Math.round(options.days ?? 30));
  const end = options.endDate || lastCompleteDay(data);
  const start = addDays(end, -(days - 1));
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  const windowDays = listDays(start, end);
  const previousDays = listDays(previousStart, previousEnd);

  const nights = buildNights(data.sleep || []);
  const hrv = dailyValues(data.hrv || [], "mean", sourceRank);
  const restingHR = dailyValues(data.restingHR || [], "mean", sourceRank);
  const steps = dailyTotals(data.steps || []);
  const activeEnergy = dailyTotals(data.activeEnergy || []);
  const protein = dailyValues(data.dietaryProtein || [], "sum", null, true);
  const calories = dailyValues(data.dietaryEnergy || [], "sum", null, true);
  const workouts = buildWorkouts(data.workouts || []);

  const current = periodStats({ windowDays, nights, hrv, restingHR, steps, activeEnergy, protein, calories, workouts });
  const previous = periodStats({ windowDays: previousDays, nights, hrv, restingHR, steps, activeEnergy, protein, calories, workouts });
  const recentDays = windowDays.slice(-7);
  const recent = periodStats({ windowDays: recentDays, nights, hrv, restingHR, steps, activeEnergy, protein, calories, workouts });

  const summary = {
    period: {
      days,
      start,
      end,
      word: periodWord(days),
      label: periodLabel(days),
      previousStart,
      previousEnd,
    },
    coverage: {
      sleep: current.sleep.nights,
      recovery: current.recovery.days,
      activity: current.activity.days,
      nutrition: current.nutrition.days,
      days,
    },
    current,
    previous,
    recent,
  };

  summary.person = personFrom(data.profile, end);
  summary.changes = buildChanges(current, previous);
  summary.scores = buildScores(current);
  summary.recoveryBand = recoveryBand(current, summary.person);
  summary.highlights = buildHighlights(summary);
  summary.facts = buildFacts(current);
  summary.standout = pickStandout(summary);
  return summary;
}

/**
 * The last complete day: the day before the export, because the export day
 * itself is still unfinished.
 */
export function lastCompleteDay(data) {
  const exportStamp = parseStamp(data.exportDate);
  if (exportStamp) {
    return addDays(exportStamp.day, -1);
  }
  let latest = null;
  for (const key of ["steps", "sleep", "hrv", "activeEnergy"]) {
    for (const record of data[key] || []) {
      const day = parseStamp(record.start)?.day;
      if (day && (!latest || day > latest)) latest = day;
    }
  }
  return latest || new Date().toISOString().slice(0, 10);
}

// ─── Per-period statistics ───

function periodStats({ windowDays, nights, hrv, restingHR, steps, activeEnergy, protein, calories, workouts }) {
  const inWindow = new Set(windowDays);
  const periodNights = windowDays.map((day) => nights.get(day)).filter(Boolean);
  const staged = periodNights.filter((night) => night.hasStages);
  const bedtimes = periodNights.map((night) => night.bedtimeMinutes);

  const pick = (map) => windowDays.filter((day) => map.has(day)).map((day) => ({ day, value: map.get(day) }));
  const hrvDays = pick(hrv);
  const rhrDays = pick(restingHR);
  const recoveryDays = new Set([...hrvDays, ...rhrDays].map((entry) => entry.day));
  const stepDays = pick(steps).filter((entry) => entry.value > 0);
  const energyDays = pick(activeEnergy).filter((entry) => entry.value > 0);
  const proteinDays = pick(protein).filter((entry) => entry.value > 0);
  const calorieDays = pick(calories).filter((entry) => entry.value > 0);
  const nutritionDays = new Set([...proteinDays, ...calorieDays].map((entry) => entry.day));
  const periodWorkouts = workouts.filter((workout) => inWindow.has(workout.day));
  const weeks = windowDays.length / 7;

  return {
    days: windowDays.length,
    sleep: {
      nights: periodNights.length,
      stagedNights: staged.length,
      averageMinutes: mean(periodNights.map((night) => night.asleepMinutes)),
      deepMinutes: mean(staged.map((night) => night.deepMinutes)),
      remMinutes: mean(staged.map((night) => night.remMinutes)),
      coreMinutes: mean(staged.map((night) => night.coreMinutes)),
      bedtimeMinutes: mean(bedtimes),
      bedtimeSpreadMinutes: bedtimes.length >= 5 ? stddev(bedtimes) : null,
      longestNight: maxBy(periodNights, (night) => night.asleepMinutes),
      deepestNight: maxBy(staged, (night) => night.deepMinutes),
      bestStreak: longestStreak(windowDays, (day) => (nights.get(day)?.asleepMinutes ?? 0) >= MARKS.sleepMinutes),
    },
    recovery: {
      days: recoveryDays.size,
      hrvDays: hrvDays.length,
      hrv: mean(hrvDays.map((entry) => entry.value)),
      hrvPeak: maxBy(hrvDays, (entry) => entry.value),
      restingDays: rhrDays.length,
      restingHR: mean(rhrDays.map((entry) => entry.value)),
      lowestResting: maxBy(rhrDays, (entry) => -entry.value),
    },
    activity: {
      days: stepDays.length,
      steps: mean(stepDays.map((entry) => entry.value)),
      totalSteps: sum(stepDays.map((entry) => entry.value)),
      bestStepDay: maxBy(stepDays, (entry) => entry.value),
      activeEnergy: mean(energyDays.map((entry) => entry.value)),
      workouts: periodWorkouts.length,
      strength: periodWorkouts.filter((workout) => workout.strength).length,
      workoutsPerWeek: weeks > 0 ? periodWorkouts.length / weeks : null,
      strengthPerWeek: weeks > 0 ? periodWorkouts.filter((workout) => workout.strength).length / weeks : null,
    },
    nutrition: {
      days: nutritionDays.size,
      proteinDays: proteinDays.length,
      protein: mean(proteinDays.map((entry) => entry.value)),
      calories: mean(calorieDays.map((entry) => entry.value)),
    },
  };
}

// ─── Changes, scores, highlights ───

function buildChanges(current, previous) {
  const enough = (a, b) => a >= 7 && b >= 7;
  const changes = [];
  const add = (metric, now, before, okay, higherIsBetter = true) => {
    if (!okay || now == null || before == null) return;
    const delta = now - before;
    const meaningful = Math.abs(delta) >= MEANINGFUL_CHANGE[metric];
    changes.push({
      metric,
      now,
      before,
      delta,
      meaningful,
      improved: meaningful && (higherIsBetter ? delta > 0 : delta < 0),
    });
  };
  add("sleepMinutes", current.sleep.averageMinutes, previous.sleep.averageMinutes, enough(current.sleep.nights, previous.sleep.nights));
  add("deepMinutes", current.sleep.deepMinutes, previous.sleep.deepMinutes, enough(current.sleep.stagedNights, previous.sleep.stagedNights));
  add("remMinutes", current.sleep.remMinutes, previous.sleep.remMinutes, enough(current.sleep.stagedNights, previous.sleep.stagedNights));
  add("steps", current.activity.steps, previous.activity.steps, enough(current.activity.days, previous.activity.days));
  add("hrv", current.recovery.hrv, previous.recovery.hrv, enough(current.recovery.hrvDays, previous.recovery.hrvDays));
  add("restingHR", current.recovery.restingHR, previous.recovery.restingHR, enough(current.recovery.restingDays, previous.recovery.restingDays), false);
  return changes;
}

/**
 * The 0–100 ring: the plain average of up to three parts.
 *  - Sleep: average sleep, from 4 hours (0) to 8 hours or more (100).
 *  - Movement: average daily steps, from 0 to 10,000 or more (100).
 *  - Recovery: average resting heart rate, from 80 bpm or more (0) to 50 bpm or less (100).
 * Shown only when at least two parts have 5 or more days of data.
 */
function buildScores(current) {
  const parts = {};
  if (current.sleep.nights >= 5) {
    parts.sleep = clampScore(((current.sleep.averageMinutes - 240) / (480 - 240)) * 100);
  }
  if (current.activity.days >= 5) {
    parts.activity = clampScore((current.activity.steps / 10000) * 100);
  }
  if (current.recovery.restingDays >= 5) {
    parts.recovery = clampScore(((80 - current.recovery.restingHR) / (80 - 50)) * 100);
  }
  const values = Object.values(parts);
  return {
    parts,
    overall: values.length >= 2 ? Math.round(mean(values)) : null,
  };
}

function buildHighlights(summary) {
  const { current, changes } = summary;
  const changeFor = (metric) => changes.find((change) => change.metric === metric && change.improved) || null;
  const items = [];

  if (current.activity.days >= 3) {
    items.push({
      key: "total_steps",
      domain: "activity",
      icon: "walk",
      value: current.activity.totalSteps,
      unit: "steps_total",
      tier: tierFor("steps", current.activity.steps),
      change: changeFor("steps"),
    });
  }

  if (current.sleep.stagedNights >= 3) {
    const deepTier = tierFor("deepMinutes", current.sleep.deepMinutes);
    const remTier = tierFor("remMinutes", current.sleep.remMinutes);
    const useRem = tierRank(remTier) > tierRank(deepTier);
    items.push(useRem
      ? { key: "avg_rem_sleep", domain: "sleep", icon: "moon", value: current.sleep.remMinutes, unit: "minutes", tier: remTier, change: changeFor("remMinutes") }
      : { key: "avg_deep_sleep", domain: "sleep", icon: "moon", value: current.sleep.deepMinutes, unit: "minutes", tier: deepTier, change: changeFor("deepMinutes") });
  } else if (current.sleep.nights >= 3) {
    items.push({
      key: "avg_sleep",
      domain: "sleep",
      icon: "moon",
      value: current.sleep.averageMinutes,
      unit: "minutes",
      tier: tierFor("sleepMinutes", current.sleep.averageMinutes),
      change: changeFor("sleepMinutes"),
    });
  }

  if (current.recovery.hrvDays >= 3) {
    items.push({
      key: "avg_hrv",
      domain: "recovery",
      icon: "pulse",
      value: current.recovery.hrv,
      unit: "ms",
      tier: tierFor("hrv", current.recovery.hrv),
      change: changeFor("hrv"),
    });
  } else if (current.recovery.restingDays >= 3) {
    items.push({
      key: "avg_resting_hr",
      domain: "recovery",
      icon: "heart",
      value: current.recovery.restingHR,
      unit: "bpm",
      tier: restingTier(current.recovery.restingHR),
      change: changes.find((change) => change.metric === "restingHR" && change.improved) || null,
    });
  }

  if (current.activity.strength >= 1) {
    items.push({
      key: "strength_sessions",
      domain: "activity",
      icon: "dumbbell",
      value: current.activity.strength,
      unit: "count",
      tier: tierFor("strengthPerWeek", current.activity.strengthPerWeek),
    });
  } else if (current.activity.workouts >= 1) {
    items.push({
      key: "workout_sessions",
      domain: "activity",
      icon: "dumbbell",
      value: current.activity.workouts,
      unit: "count",
      tier: tierFor("workoutsPerWeek", current.activity.workoutsPerWeek),
    });
  } else if (current.sleep.bestStreak >= 3) {
    items.push({ key: "best_sleep_streak", domain: "sleep", icon: "moon", value: current.sleep.bestStreak, unit: "nights", tier: null });
  }

  if (items.length < 4 && current.nutrition.proteinDays >= 3) {
    items.push({
      key: "avg_protein",
      domain: "nutrition",
      icon: "leaf",
      value: current.nutrition.protein,
      unit: "grams",
      tier: tierFor("protein", current.nutrition.protein),
    });
  }

  // An even count keeps the two-column grid tidy.
  return items.slice(0, items.length >= 4 ? 4 : items.length >= 2 ? 2 : items.length);
}

function buildFacts(current) {
  const facts = [];
  if (current.sleep.longestNight) {
    facts.push({ key: "best_single_night", icon: "moon", value: current.sleep.longestNight.asleepMinutes, unit: "minutes", day: current.sleep.longestNight.day });
  }
  if (current.sleep.deepestNight) {
    facts.push({ key: "deepest_night", icon: "moon", value: current.sleep.deepestNight.deepMinutes, unit: "minutes", day: current.sleep.deepestNight.day });
  }
  if (current.activity.bestStepDay) {
    facts.push({ key: "best_step_day", icon: "walk", value: current.activity.bestStepDay.value, unit: "steps", day: current.activity.bestStepDay.day });
  }
  if (current.recovery.hrvPeak) {
    facts.push({ key: "hrv_peak", icon: "pulse", value: current.recovery.hrvPeak.value, unit: "ms", day: current.recovery.hrvPeak.day });
  } else if (current.recovery.lowestResting) {
    facts.push({ key: "lowest_resting_hr", icon: "heart", value: current.recovery.lowestResting.value, unit: "bpm", day: current.recovery.lowestResting.day });
  }
  return facts;
}

/**
 * The Wrapped identity. A part "stands out" when its average clears a common
 * mark; the clearest one wins, with recovery, deep sleep, sleep timing, then
 * movement breaking ties.
 */
function pickStandout(summary) {
  const { current, changes } = summary;
  const bestCoverage = Math.max(current.sleep.nights, current.recovery.hrvDays, current.recovery.restingDays, current.activity.days, current.nutrition.days);
  if (bestCoverage < 7) {
    return { archetype: "warming_up", dimension: null, strengths: [] };
  }

  const strengths = [];
  if (current.recovery.hrvDays >= 5 && current.recovery.hrv >= MARKS.hrvStrongMs) {
    strengths.push({ dimension: "recovery", basis: "hrv", ratio: current.recovery.hrv / MARKS.hrvStrongMs, priority: 0 });
  } else if (current.recovery.restingDays >= 5 && current.recovery.restingHR <= MARKS.restingHrStrongBpm) {
    strengths.push({ dimension: "recovery", basis: "rhr", ratio: MARKS.restingHrStrongBpm / current.recovery.restingHR, priority: 0 });
  }
  if (current.sleep.stagedNights >= 5 && current.sleep.deepMinutes >= MARKS.deepStrongMinutes) {
    strengths.push({ dimension: "deep_sleep", basis: "deep", ratio: current.sleep.deepMinutes / MARKS.deepStrongMinutes, priority: 1 });
  }
  if (current.sleep.bedtimeSpreadMinutes != null && current.sleep.bedtimeSpreadMinutes <= MARKS.bedtimeSteadyMinutes) {
    strengths.push({ dimension: "regularity", basis: "bedtime", ratio: MARKS.bedtimeSteadyMinutes / Math.max(current.sleep.bedtimeSpreadMinutes, 10), priority: 2 });
  }
  if (current.activity.days >= 5 && current.activity.steps >= 8000) {
    strengths.push({ dimension: "activity", basis: "steps", ratio: current.activity.steps / 8000, priority: 3 });
  }

  if (strengths.length >= 3) {
    return { archetype: "all_rounder", dimension: null, strengths };
  }
  if (strengths.length) {
    const top = strengths.slice().sort((a, b) => b.ratio - a.ratio || a.priority - b.priority)[0];
    const archetype = { recovery: "unbothered", deep_sleep: "lights_out", regularity: "clockwork", activity: "engine" }[top.dimension];
    return { archetype, dimension: top.dimension, basis: top.basis, strengths };
  }
  if (changes.filter((change) => change.improved).length >= 2) {
    return { archetype: "on_the_rise", dimension: null, strengths };
  }
  return { archetype: "tracker", dimension: null, strengths };
}

// ─── Age-based recovery band ───

function personFrom(profile = {}, onDay) {
  const birth = /^(\d{4})-(\d{2})-(\d{2})/.exec(profile.dateOfBirth || "");
  let age = null;
  if (birth) {
    const [year, month, day] = onDay.split("-").map(Number);
    age = year - Number(birth[1]) - (month < Number(birth[2]) || (month === Number(birth[2]) && day < Number(birth[3])) ? 1 : 0);
    if (age < 13 || age > 110) age = null;
  }
  const sex = /Female/.test(profile.sex || "") ? "female" : /Male/.test(profile.sex || "") ? "male" : null;
  return { age, sex };
}

/**
 * "Top ~X% recovery among people your age": the person's own average from at
 * least 10 days, placed on a published age-based norm and rounded to a coarse
 * band (top 5, 10, or 25%). HRV first, then resting heart rate. Nothing when
 * the age is unknown or the average is not in the top quarter.
 */
function recoveryBand(current, person) {
  if (person.age == null) return null;
  const { recovery } = current;
  if (recovery.hrvDays >= BAND_MIN_DAYS && recovery.hrv != null) {
    const [mean, sd] = normFor(HRV_SDNN_NORMS, person.age);
    const band = coarseBand(upperTail((recovery.hrv - mean) / sd));
    if (band) return { band, basis: "hrv" };
  }
  if (recovery.restingDays >= BAND_MIN_DAYS && recovery.restingHR != null) {
    let [mean, sd] = normFor(RESTING_HR_NORMS, person.age);
    if (person.sex === "female") mean += RESTING_HR_FEMALE_OFFSET;
    // Lower resting heart rate is the stronger read.
    const band = coarseBand(upperTail((mean - recovery.restingHR) / sd));
    if (band) return { band, basis: "rhr" };
  }
  return null;
}

function normFor(table, age) {
  for (const [maxAge, mean, sd] of table) {
    if (age <= maxAge) return [mean, sd];
  }
  const last = table[table.length - 1];
  return [last[1], last[2]];
}

// Round to the least impressive coarse band the read clears, so it never overclaims.
function coarseBand(topFraction) {
  if (!(topFraction <= 0.25)) return null;
  if (topFraction <= 0.05) return 5;
  if (topFraction <= 0.1) return 10;
  return 25;
}

// P(X > mean + z·sd) for a normal distribution.
function upperTail(z) {
  return 0.5 * erfc(z / Math.SQRT2);
}

// Abramowitz and Stegun 7.1.26, accurate to about 1e-7.
function erfc(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const value = poly * Math.exp(-x * x);
  return x >= 0 ? value : 2 - value;
}

// ─── Tiers ───

function tierFor(metric, value) {
  const bands = TIER_BANDS[metric];
  if (!bands || value == null || !Number.isFinite(value)) return null;
  const [fair, strong, elite] = bands;
  if (elite != null && value >= elite) return "elite";
  if (value >= strong) return "strong";
  if (value >= fair) return "fair";
  return null;
}

function restingTier(value) {
  if (value == null) return null;
  if (value <= 60) return "strong";
  if (value <= 70) return "fair";
  return null;
}

function tierRank(tier) {
  return { elite: 3, strong: 2, fair: 1 }[tier] || 0;
}

/** Direction of the last 7 days against the period average: "up", "down", "steady", or null. */
export function directionFor(latest, baseline) {
  if (latest == null || baseline == null || !Number.isFinite(latest) || !Number.isFinite(baseline) || baseline === 0) return null;
  const relative = (latest - baseline) / Math.abs(baseline);
  if (relative > STEADY_BAND) return "up";
  if (relative < -STEADY_BAND) return "down";
  return "steady";
}

// ─── Sleep nights ───

function buildNights(records) {
  const segments = [];
  for (const record of records) {
    if (record.value === "HKCategoryValueSleepAnalysisInBed") continue;
    const start = parseStamp(record.start);
    const end = parseStamp(record.end);
    if (!start || !end || end.ms <= start.ms) continue;
    segments.push({ value: record.value, source: record.source || "", startMs: start.ms, endMs: end.ms, startMinutes: start.minutes, end });
  }
  segments.sort((a, b) => a.startMs - b.startMs);

  // Build whole sleep sessions first: readings closer than two hours belong
  // together, even when they cross midnight or 6 PM.
  const sessions = [];
  let current = null;
  for (const segment of segments) {
    if (current && segment.startMs - current.endMs <= SESSION_GAP_MINUTES * 60000) {
      current.segments.push(segment);
      if (segment.endMs > current.endMs) {
        current.endMs = segment.endMs;
        current.end = segment.end;
      }
    } else {
      current = { segments: [segment], endMs: segment.endMs, end: segment.end };
      sessions.push(current);
    }
  }

  const nights = new Map();
  for (const session of sessions) {
    const night = summarizeSession(session);
    if (!night) continue;
    // A night belongs to the morning it ends; sleep that ends in the evening
    // belongs to the next morning. The longest session of the day is the main
    // sleep, so naps stay out.
    const day = session.end.minutes >= 18 * 60 ? addDays(session.end.day, 1) : session.end.day;
    const existing = nights.get(day);
    if (!existing || night.asleepMinutes > existing.asleepMinutes) {
      nights.set(day, { day, ...night });
    }
  }
  return nights;
}

function summarizeSession(session) {
  const merged = mergeSegments(session.segments);
  let deep = 0;
  let rem = 0;
  let core = 0;
  let unspecified = 0;
  let awake = 0;
  let firstAsleep = null;
  for (const segment of merged) {
    const minutes = (segment.endMs - segment.startMs) / 60000;
    switch (segment.value) {
      case "HKCategoryValueSleepAnalysisAsleepDeep": deep += minutes; break;
      case "HKCategoryValueSleepAnalysisAsleepREM": rem += minutes; break;
      case "HKCategoryValueSleepAnalysisAsleepCore": core += minutes; break;
      case "HKCategoryValueSleepAnalysisAsleepUnspecified":
      case "HKCategoryValueSleepAnalysisAsleep": unspecified += minutes; break;
      case "HKCategoryValueSleepAnalysisAwake": awake += minutes; break;
      default: break;
    }
    if (segment.value !== "HKCategoryValueSleepAnalysisAwake" && (!firstAsleep || segment.startMs < firstAsleep.startMs)) {
      firstAsleep = segment;
    }
  }

  const asleep = deep + rem + core + unspecified;
  if (asleep < MIN_MAIN_SLEEP_MINUTES || asleep > 16 * 60 || !firstAsleep) return null;
  const startMinutes = firstAsleep.startMinutes;
  return {
    asleepMinutes: asleep,
    deepMinutes: deep,
    remMinutes: rem,
    coreMinutes: core + unspecified,
    awakeMinutes: awake,
    hasStages: deep + rem > 0,
    // Minutes after the previous midnight, so 00:30 reads as 24:30.
    bedtimeMinutes: startMinutes < 12 * 60 ? startMinutes + 24 * 60 : startMinutes,
  };
}

// When two devices record the same minutes, keep one reading: the higher-ranked
// device first, then the more specific sleep stage.
function mergeSegments(segments) {
  const boundaries = [...new Set(segments.flatMap((segment) => [segment.startMs, segment.endMs]))].sort((a, b) => a - b);
  const merged = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const startMs = boundaries[index];
    const endMs = boundaries[index + 1];
    const overlapping = segments.filter((segment) => segment.startMs < endMs && segment.endMs > startMs);
    if (!overlapping.length) continue;
    const chosen = overlapping.slice().sort((a, b) =>
      sourceRank(b.source) - sourceRank(a.source) || stageRank(b.value) - stageRank(a.value))[0];
    const previous = merged[merged.length - 1];
    if (previous && previous.value === chosen.value && previous.endMs === startMs) {
      previous.endMs = endMs;
      continue;
    }
    const startMinutes = chosen.startMinutes + Math.round((startMs - chosen.startMs) / 60000);
    merged.push({ value: chosen.value, startMs, endMs, startMinutes: ((startMinutes % 1440) + 1440) % 1440 });
  }
  return merged;
}

function stageRank(value) {
  switch (value) {
    case "HKCategoryValueSleepAnalysisAsleepDeep": return 5;
    case "HKCategoryValueSleepAnalysisAsleepREM": return 4;
    case "HKCategoryValueSleepAnalysisAsleepCore": return 3;
    case "HKCategoryValueSleepAnalysisAwake": return 2;
    default: return 1;
  }
}

// ─── Daily values ───

function dailyValues(records, mode, rank, dedupeExact = false) {
  const byDay = new Map();
  for (const record of records) {
    const stamp = parseStamp(record.start);
    const value = Number(record.value);
    if (!stamp || !Number.isFinite(value)) continue;
    if (!byDay.has(stamp.day)) byDay.set(stamp.day, []);
    byDay.get(stamp.day).push({ ...record, value });
  }

  const result = new Map();
  for (const [day, dayRecords] of byDay) {
    let kept = dedupeExact ? dedupe(dayRecords) : dayRecords;
    if (rank) {
      const best = Math.max(...kept.map((record) => rank(record.source || "")));
      kept = kept.filter((record) => rank(record.source || "") === best);
    }
    const values = kept.map((record) => record.value);
    if (!values.length) continue;
    result.set(day, mode === "mean" ? mean(values) : sum(values));
  }
  return result;
}

/**
 * Daily totals for counts like steps, where a watch and a phone (or two
 * watches) often record the same minutes. Readings are taken in device order
 * (watch, then phone, then others; the busier device first within a kind); a
 * reading only counts for the minutes no earlier device already covered, so
 * overlaps count once and a phone still counts the hours the watch was off.
 */
function dailyTotals(records) {
  const byDay = new Map();
  for (const record of records) {
    const start = parseStamp(record.start);
    const end = parseStamp(record.end) || start;
    const value = Number(record.value);
    if (!start || !Number.isFinite(value) || value < 0) continue;
    if (!byDay.has(start.day)) byDay.set(start.day, []);
    byDay.get(start.day).push({ value, source: record.source || "", startMs: start.ms, endMs: Math.max(start.ms, end.ms) });
  }

  const result = new Map();
  for (const [day, dayRecords] of byDay) {
    // Between two devices of the same kind, trust the one that recorded more that day.
    const sourceTotals = new Map();
    for (const record of dayRecords) sourceTotals.set(record.source, (sourceTotals.get(record.source) || 0) + record.value);
    const ordered = dayRecords.slice().sort((a, b) =>
      sourceRank(b.source) - sourceRank(a.source)
      || sourceTotals.get(b.source) - sourceTotals.get(a.source)
      || (a.source < b.source ? -1 : a.source > b.source ? 1 : 0)
      || a.startMs - b.startMs);
    const covered = [];
    const instants = new Set();
    let total = 0;
    for (const record of ordered) {
      const length = record.endMs - record.startMs;
      if (length === 0) {
        if (!isCovered(covered, record.startMs) && !instants.has(record.startMs)) total += record.value;
        instants.add(record.startMs);
        continue;
      }
      const overlap = coveredLength(covered, record.startMs, record.endMs);
      total += record.value * Math.max(0, (length - overlap) / length);
      addInterval(covered, record.startMs, record.endMs);
    }
    result.set(day, total);
  }
  return result;
}

// `covered` is a sorted list of non-overlapping [start, end] intervals.
function coveredLength(covered, start, end) {
  let length = 0;
  for (let index = firstEndingAfter(covered, start); index < covered.length && covered[index][0] < end; index += 1) {
    length += Math.min(end, covered[index][1]) - Math.max(start, covered[index][0]);
  }
  return length;
}

function isCovered(covered, at) {
  const index = firstEndingAfter(covered, at);
  return index < covered.length && covered[index][0] <= at;
}

function addInterval(covered, start, end) {
  let index = firstEndingAfter(covered, start - 1);
  let from = start;
  let to = end;
  let remove = 0;
  while (index + remove < covered.length && covered[index + remove][0] <= to) {
    from = Math.min(from, covered[index + remove][0]);
    to = Math.max(to, covered[index + remove][1]);
    remove += 1;
  }
  covered.splice(index, remove, [from, to]);
}

function firstEndingAfter(covered, at) {
  let low = 0;
  let high = covered.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (covered[middle][1] > at) high = middle;
    else low = middle + 1;
  }
  return low;
}

function dedupe(records) {
  const seen = new Map();
  for (const record of records) {
    seen.set(`${record.start}|${record.end}|${record.value.toFixed(4)}|${record.unit || ""}`, record);
  }
  return [...seen.values()];
}

// When a day has readings from several devices, keep only the best device so
// a watch and a phone are not counted twice.
function sourceRank(source = "") {
  const normalized = source.toLowerCase();
  if (normalized.includes("watch")) return 300;
  if (normalized.includes("iphone")) return 200;
  if (normalized === "health") return 150;
  return 100;
}

function buildWorkouts(records) {
  const workouts = [];
  for (const record of records) {
    const stamp = parseStamp(record.start);
    if (!stamp) continue;
    const minutes = toMinutes(record.duration, record.durationUnit);
    if (!(minutes >= 5)) continue;
    workouts.push({ day: stamp.day, type: record.type || "Other", minutes, strength: STRENGTH_TYPES.has(record.type) });
  }
  return workouts;
}

function toMinutes(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  switch ((unit || "min").toLowerCase()) {
    case "s":
    case "sec":
      return amount / 60;
    case "hr":
    case "h":
      return amount * 60;
    default:
      return amount;
  }
}

// ─── Dates ───

/**
 * Read an Apple Health timestamp ("2026-10-24 07:12:03 -0500").
 * `day` and `minutes` are the wall clock where the reading was taken;
 * `ms` is the exact moment, used for durations.
 */
export function parseStamp(stamp) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?(?:\s*(?:([+-])(\d{2}):?(\d{2})|Z))?/.exec(String(stamp || ""));
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0", sign, offsetHours, offsetMinutes] = match;
  const offset = sign ? (sign === "-" ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes)) : 0;
  const wallClock = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return {
    day: `${year}-${month}-${day}`,
    minutes: Number(hour) * 60 + Number(minute),
    ms: wallClock - offset * 60000,
  };
}

export function addDays(isoDay, count) {
  const date = new Date(`${isoDay}T00:00:00Z`);
  return new Date(date.getTime() + count * DAY_MS).toISOString().slice(0, 10);
}

function listDays(start, end) {
  const days = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

export function periodWord(days) {
  if (days <= 10) return "week";
  if (days <= 45) return "month";
  if (days >= 300) return "year";
  return "period";
}

function periodLabel(days) {
  if (days >= 360 && days <= 370) return "Last 12 months";
  return `Last ${days} days`;
}

// ─── Math ───

function longestStreak(days, test) {
  let best = 0;
  let run = 0;
  for (const day of days) {
    run = test(day) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function mean(values) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return null;
  return usable.reduce((total, value) => total + value, 0) / usable.length;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function stddev(values) {
  const average = mean(values);
  if (average == null) return null;
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

function maxBy(items, score) {
  let best = null;
  let bestScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}
