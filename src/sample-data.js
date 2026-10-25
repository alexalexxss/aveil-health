/**
 * Synthetic Apple Health export for the demo command, tests, and README images.
 *
 * Every value comes from a seeded random generator, so the same options always
 * give the same file. None of it is anyone's real health data.
 */

export const SAMPLE_PROFILES = {
  // A well-rested, active person whose last month edged ahead of the one before.
  steady: {
    dateOfBirth: "1992-03-14",
    bedtimeMinutes: 23 * 60 + 5,
    bedtimeJitter: 18,
    sleepMinutes: 446,
    sleepJitter: 24,
    deepMinutes: 72,
    remMinutes: 98,
    hrv: 58,
    hrvJitter: 7,
    restingHR: 56,
    steps: 9800,
    stepsJitter: 2100,
    activeEnergy: 540,
    workoutsPerWeek: 3.4,
    strengthShare: 0.6,
    foodLogShare: 0.7,
    protein: 112,
    calories: 2150,
    recentLift: { days: 30, deepMinutes: 10, steps: 1300, hrv: 4 },
  },
  // Short, irregular sleep and a light movement base.
  short_sleep: {
    dateOfBirth: "1986-07-02",
    bedtimeMinutes: 24 * 60 + 25,
    bedtimeJitter: 62,
    sleepMinutes: 366,
    sleepJitter: 40,
    deepMinutes: 41,
    remMinutes: 66,
    hrv: 36,
    hrvJitter: 8,
    restingHR: 66,
    steps: 5200,
    stepsJitter: 1800,
    activeEnergy: 280,
    workoutsPerWeek: 0.8,
    strengthShare: 0.2,
    foodLogShare: 0.15,
    protein: 74,
    calories: 1900,
    recentLift: { days: 30, deepMinutes: -6, steps: -500, hrv: -3 },
  },
  // Lots of walking and training; average sleep.
  mover: {
    dateOfBirth: "1997-11-20",
    bedtimeMinutes: 22 * 60 + 50,
    bedtimeJitter: 35,
    sleepMinutes: 418,
    sleepJitter: 30,
    deepMinutes: 58,
    remMinutes: 88,
    hrv: 51,
    hrvJitter: 8,
    restingHR: 54,
    steps: 15200,
    stepsJitter: 2600,
    activeEnergy: 820,
    workoutsPerWeek: 5.2,
    strengthShare: 0.35,
    foodLogShare: 0.5,
    protein: 128,
    calories: 2700,
    recentLift: { days: 30, deepMinutes: 0, steps: 900, hrv: 2 },
  },
};

const WATCH = "Sample Apple Watch";
const PHONE = "Sample iPhone";
const FOOD_APP = "Sample Food Log";
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the text of a synthetic export.xml.
 * @param {object} [options]
 * @param {string} [options.profile="steady"] - a key of SAMPLE_PROFILES
 * @param {string} [options.endDate="2026-10-24"] - local date of the export (YYYY-MM-DD)
 * @param {number} [options.days=120] - days of history before the export date
 * @param {number} [options.seed=7] - random seed
 * @param {string} [options.utcOffset="-0500"] - the offset written on every record
 * @returns {string}
 */
export function buildSampleExportXml(options = {}) {
  const profileName = options.profile ?? "steady";
  const profile = SAMPLE_PROFILES[profileName];
  if (!profile) throw new Error(`Unknown sample profile: ${profileName}`);

  const days = options.days ?? 120;
  const endDate = options.endDate ?? "2026-10-24";
  const offset = options.utcOffset ?? "-0500";
  const random = seededRandom(options.seed ?? 7);
  const lines = [];

  const end = Date.UTC(...dateParts(endDate));
  const exportClock = end + (8 * 60 + 2) * 60 * 1000;
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<HealthData locale="en_US">');
  lines.push(` <ExportDate value="${stamp(exportClock, offset)}"/>`);
  lines.push(` <Me HKCharacteristicTypeIdentifierDateOfBirth="${profile.dateOfBirth ?? ""}" HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexNotSet" HKCharacteristicTypeIdentifierBloodType="HKBloodTypeNotSet"/>`);

  for (let index = days; index >= 1; index -= 1) {
    // `day` is local midnight of the day that ends with this night's wake-up.
    const day = end - (index - 1) * DAY_MS;
    const lift = liftFor(profile, index - 1);
    const weekday = new Date(day).getUTCDay();
    const weekend = weekday === 0 || weekday === 6;

    const night = buildNight(profile, lift, random, day, weekend);
    for (const segment of night.segments) {
      lines.push(categoryRecord("HKCategoryTypeIdentifierSleepAnalysis", segment.value, segment.start, segment.end, offset));
    }

    const hrvBase = profile.hrv + lift.hrv + (night.asleepMinutes - profile.sleepMinutes) / 12;
    const hrvSamples = 4 + Math.floor(random() * 3);
    for (let sample = 0; sample < hrvSamples; sample += 1) {
      const at = night.sleepStart + ((sample + 1) / (hrvSamples + 1)) * (night.sleepEnd - night.sleepStart);
      const value = Math.max(12, normal(random, hrvBase, profile.hrvJitter));
      lines.push(quantityRecord("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", "ms", value.toFixed(3), at, at, WATCH, offset));
    }

    const restingHR = Math.round(normal(random, profile.restingHR - lift.hrv / 4, 1.8));
    lines.push(quantityRecord("HKQuantityTypeIdentifierRestingHeartRate", "count/min", String(restingHR), day + 6 * 3600000, day + 23 * 3600000, WATCH, offset));

    const stepsTotal = Math.max(900, normal(random, profile.steps + lift.steps + (weekend ? 900 : 0), profile.stepsJitter));
    const energyTotal = Math.max(80, profile.activeEnergy * (stepsTotal / profile.steps) * normal(random, 1, 0.08));
    const weights = hourWeights(random);
    for (const [hour, weight] of weights) {
      const start = day + hour * 3600000;
      const finish = start + 50 * 60000;
      lines.push(quantityRecord("HKQuantityTypeIdentifierStepCount", "count", String(Math.round(stepsTotal * weight)), start, finish, WATCH, offset));
      lines.push(quantityRecord("HKQuantityTypeIdentifierStepCount", "count", String(Math.round(stepsTotal * weight * 0.82)), start, finish, PHONE, offset));
      lines.push(quantityRecord("HKQuantityTypeIdentifierActiveEnergyBurned", "kcal", (energyTotal * weight).toFixed(3), start, finish, WATCH, offset));
    }

    if (random() < profile.workoutsPerWeek / 7) {
      const strength = random() < profile.strengthShare;
      const type = strength ? "TraditionalStrengthTraining" : weekend ? "Running" : "Walking";
      const minutes = Math.round(normal(random, strength ? 48 : 38, 8));
      const start = day + (17 * 60 + Math.round(random() * 90)) * 60000;
      lines.push(workoutRecord(type, minutes, Math.round(minutes * (strength ? 6.2 : 8.4)), start, start + minutes * 60000, offset));
    }

    if (random() < profile.foodLogShare) {
      const meals = [[8, 0.25], [13, 0.35], [19, 0.4]];
      const protein = Math.max(20, normal(random, profile.protein, 14));
      const calories = Math.max(800, normal(random, profile.calories, 180));
      for (const [hour, share] of meals) {
        const at = day + (hour * 60 + Math.round(random() * 40)) * 60000;
        lines.push(quantityRecord("HKQuantityTypeIdentifierDietaryProtein", "g", (protein * share).toFixed(1), at, at, FOOD_APP, offset));
        lines.push(quantityRecord("HKQuantityTypeIdentifierDietaryEnergyConsumed", "kcal", (calories * share).toFixed(1), at, at, FOOD_APP, offset));
      }
    }
  }

  lines.push("</HealthData>");
  return `${lines.join("\n")}\n`;
}

function buildNight(profile, lift, random, wakeDay, weekend) {
  const bedtime = normal(random, profile.bedtimeMinutes + (weekend ? 30 : 0), profile.bedtimeJitter);
  const sleepStart = wakeDay - DAY_MS + Math.round(bedtime) * 60000;
  const asleep = clamp(normal(random, profile.sleepMinutes, profile.sleepJitter), 240, 600);
  const deep = clamp(normal(random, profile.deepMinutes + lift.deepMinutes, 9), 12, asleep * 0.3);
  const rem = clamp(normal(random, profile.remMinutes, 13), 20, asleep * 0.35);
  const core = Math.max(60, asleep - deep - rem);
  const cycles = Math.max(3, Math.round(asleep / 90));
  const deepShares = spread(cycles, (cycle) => Math.max(0.05, 1 - cycle * 0.3));
  const remShares = spread(cycles, (cycle) => 0.5 + cycle * 0.35);

  const segments = [];
  let cursor = sleepStart;
  const push = (value, minutes) => {
    if (minutes < 1) return;
    const end = cursor + Math.round(minutes * 60000);
    segments.push({ value, start: cursor, end });
    cursor = end;
  };

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    push("HKCategoryValueSleepAnalysisAsleepCore", (core / cycles) * 0.55);
    push("HKCategoryValueSleepAnalysisAsleepDeep", deep * deepShares[cycle]);
    push("HKCategoryValueSleepAnalysisAsleepCore", (core / cycles) * 0.45);
    push("HKCategoryValueSleepAnalysisAsleepREM", rem * remShares[cycle]);
    if (cycle < cycles - 1 && random() < 0.45) {
      push("HKCategoryValueSleepAnalysisAwake", 2 + random() * 9);
    }
  }

  return { segments, sleepStart, sleepEnd: cursor, asleepMinutes: asleep };
}

function liftFor(profile, daysBeforeEnd) {
  const lift = profile.recentLift;
  if (!lift || daysBeforeEnd >= lift.days) return { deepMinutes: 0, steps: 0, hrv: 0 };
  return lift;
}

function spread(count, weightFor) {
  const weights = Array.from({ length: count }, (_, index) => weightFor(index));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function hourWeights(random) {
  const hours = [];
  for (let hour = 7; hour <= 21; hour += 1) {
    const peak = hour === 8 || hour === 12 || hour === 18 ? 2.2 : 1;
    hours.push([hour, peak * (0.6 + random() * 0.8)]);
  }
  const total = hours.reduce((sum, [, weight]) => sum + weight, 0);
  return hours.map(([hour, weight]) => [hour, weight / total]);
}

function categoryRecord(type, value, start, end, offset) {
  return ` <Record type="${type}" sourceName="${WATCH}" value="${value}" startDate="${stamp(start, offset)}" endDate="${stamp(end, offset)}"/>`;
}

function quantityRecord(type, unit, value, start, end, source, offset) {
  return ` <Record type="${type}" sourceName="${source}" unit="${unit}" value="${value}" startDate="${stamp(start, offset)}" endDate="${stamp(end, offset)}"/>`;
}

function workoutRecord(type, minutes, kcal, start, end, offset) {
  return ` <Workout workoutActivityType="HKWorkoutActivityType${type}" duration="${minutes}" durationUnit="min" totalEnergyBurned="${kcal}" totalEnergyBurnedUnit="kcal" sourceName="${WATCH}" startDate="${stamp(start, offset)}" endDate="${stamp(end, offset)}"/>`;
}

// Times are kept as "local wall clock in UTC fields" and written with the
// record's offset, the way Apple Health writes them.
function stamp(localMs, offset) {
  const date = new Date(localMs);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${offset}`;
}

function dateParts(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return [year, month - 1, day];
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random, mean, sd) {
  const u = Math.max(random(), 1e-9);
  const v = random();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
