/**
 * Build parsed-export data objects (the shape parseHealthExport returns)
 * with exact, constant values, so summary numbers can be checked by hand.
 */
import { addDays, dayBefore, stamp } from "./xml.js";

export const END = "2026-10-23";

const WATCH = "Test Apple Watch";

export function emptyData(exportDate = "2026-10-24 08:00:00 -0500") {
  return {
    exportDate,
    profile: {},
    sleep: [],
    heartRate: [],
    hrv: [],
    steps: [],
    activeEnergy: [],
    restingHR: [],
    respRate: [],
    oxygenSat: [],
    workouts: [],
    bodyMass: [],
    dietaryEnergy: [],
    dietaryProtein: [],
    recordCount: 0,
  };
}

/** Days ending at END, oldest first. */
export function daysBack(count, end = END) {
  return Array.from({ length: count }, (_, index) => addDays(end, index - count + 1));
}

export function addNight(data, day, { bedMinutes = 23 * 60, deep = 70, rem = 90, core = 280, stages = true, source = WATCH } = {}) {
  let cursor = new Date(`${dayBefore(day)}T00:00:00Z`).getTime() + bedMinutes * 60000;
  const parts = stages
    ? [["AsleepCore", core / 2], ["AsleepDeep", deep], ["AsleepCore", core / 2], ["AsleepREM", rem]]
    : [["AsleepUnspecified", core + deep + rem]];
  for (const [stage, minutes] of parts) {
    const end = cursor + minutes * 60000;
    data.sleep.push({ value: `HKCategoryValueSleepAnalysis${stage}`, start: stamp(cursor), end: stamp(end), source });
    cursor = end;
  }
}

export function addDaily(data, key, day, value, { source = WATCH, hour = 12, minutes = 0, unit = "count" } = {}) {
  const startMs = new Date(`${day}T${String(hour).padStart(2, "0")}:00:00Z`).getTime();
  data[key].push({ value, unit, start: stamp(startMs), end: stamp(startMs + minutes * 60000), source });
}

/** A steady person: same numbers every day for `count` days ending at END. */
export function steadyData({
  count = 60,
  sleepMinutes = 440,
  deep = 70,
  rem = 90,
  bedMinutes = 23 * 60,
  steps = 9000,
  hrv = 60,
  restingHR = 56,
  protein = null,
  dateOfBirth = null,
  sex = null,
} = {}) {
  const data = emptyData();
  data.profile = { dateOfBirth, sex };
  for (const day of daysBack(count)) {
    const core = sleepMinutes - deep - rem;
    addNight(data, day, { bedMinutes, deep, rem, core });
    addDaily(data, "steps", day, steps);
    addDaily(data, "hrv", day, hrv, { hour: 3, unit: "ms" });
    addDaily(data, "restingHR", day, restingHR, { hour: 6, unit: "count/min" });
    if (protein != null) addDaily(data, "dietaryProtein", day, protein, { source: "Test Food Log", hour: 13, unit: "g" });
  }
  return data;
}
