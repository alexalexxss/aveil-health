/**
 * Build small Apple Health export.xml strings for focused tests.
 */
export function exportXml({ exportDate = "2026-10-24 08:00:00 -0500", records = [] } = {}) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<HealthData locale="en_US">',
    exportDate ? ` <ExportDate value="${exportDate}"/>` : "",
    ...records,
    "</HealthData>",
  ].join("\n");
}

export function sleep(stage, start, end, source = "Test Apple Watch") {
  return ` <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="${source}" value="HKCategoryValueSleepAnalysis${stage}" startDate="${start}" endDate="${end}"/>`;
}

export function quantity(type, value, start, { end = start, source = "Test Apple Watch", unit = "count" } = {}) {
  return ` <Record type="HKQuantityTypeIdentifier${type}" sourceName="${source}" unit="${unit}" value="${value}" startDate="${start}" endDate="${end}"/>`;
}

export function workout(type, minutes, start, end) {
  return ` <Workout workoutActivityType="HKWorkoutActivityType${type}" duration="${minutes}" durationUnit="min" sourceName="Test Apple Watch" startDate="${start}" endDate="${end}"/>`;
}

/** One ordinary night: core, deep, core, REM, ending at `wake` on `day`. */
export function night(day, { bed = "23:00", deepMinutes = 70, remMinutes = 90, coreMinutes = 280, previousDay } = {}) {
  const start = new Date(`${previousDay || dayBefore(day)}T${bed}:00Z`).getTime();
  const parts = [["Core", coreMinutes / 2], ["Deep", deepMinutes], ["Core", coreMinutes / 2], ["REM", remMinutes]];
  const records = [];
  let cursor = start;
  for (const [stage, minutes] of parts) {
    const end = cursor + minutes * 60000;
    records.push(sleep(stage, stamp(cursor), stamp(end)));
    cursor = end;
  }
  return records;
}

export function dayBefore(day) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
}

export function addDays(day, count) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + count * 86400000).toISOString().slice(0, 10);
}

// Wall-clock milliseconds (UTC fields) to an Apple timestamp at -0500.
export function stamp(ms, offset = "-0500") {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} ${offset}`;
}
