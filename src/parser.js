/**
 * Streaming Apple Health XML parser.
 * Handles multi-GB export files without loading them into memory.
 */
import { createReadStream } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sax = require("sax");

/**
 * Parse an Apple Health export.xml file into structured health data.
 * @param {string} xmlPath - Path to export.xml
 * @param {object} [opts] - Options
 * @param {number} [opts.days=30] - Number of recent days to include
 * @param {function} [opts.onProgress] - Progress callback (bytesRead, totalBytes)
 * @returns {Promise<HealthData>}
 */
export async function parseHealthExport(xmlPath, opts = {}) {
  const days = opts.days ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const data = {
    exportDate: null,
    profile: {},
    sleep: [],       // HKCategoryTypeIdentifierSleepAnalysis
    heartRate: [],    // HKQuantityTypeIdentifierHeartRate
    hrv: [],          // HKQuantityTypeIdentifierHeartRateVariabilitySDNN
    steps: [],        // HKQuantityTypeIdentifierStepCount
    activeEnergy: [], // HKQuantityTypeIdentifierActiveEnergyBurned
    restingHR: [],    // HKQuantityTypeIdentifierRestingHeartRate
    respRate: [],     // HKQuantityTypeIdentifierRespiratoryRate
    oxygenSat: [],    // HKQuantityTypeIdentifierOxygenSaturation
    workouts: [],
    bodyMass: [],     // HKQuantityTypeIdentifierBodyMass
    dietaryEnergy: [], // HKQuantityTypeIdentifierDietaryEnergyConsumed
    dietaryProtein: [], // HKQuantityTypeIdentifierDietaryProtein
  };

  const QUANTITY_MAP = {
    HKQuantityTypeIdentifierHeartRate: "heartRate",
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
    HKQuantityTypeIdentifierStepCount: "steps",
    HKQuantityTypeIdentifierActiveEnergyBurned: "activeEnergy",
    HKQuantityTypeIdentifierRestingHeartRate: "restingHR",
    HKQuantityTypeIdentifierRespiratoryRate: "respRate",
    HKQuantityTypeIdentifierOxygenSaturation: "oxygenSat",
    HKQuantityTypeIdentifierBodyMass: "bodyMass",
    HKQuantityTypeIdentifierDietaryEnergyConsumed: "dietaryEnergy",
    HKQuantityTypeIdentifierDietaryProtein: "dietaryProtein",
  };

  const CATEGORY_MAP = {
    HKCategoryTypeIdentifierSleepAnalysis: "sleep",
  };

  return new Promise((resolve, reject) => {
    const parser = sax.createStream(true, { trim: true });
    const stream = createReadStream(xmlPath, { encoding: "utf8" });

    let recordCount = 0;

    parser.on("opentag", (node) => {
      const { name, attributes: a } = node;

      if (name === "ExportDate") {
        data.exportDate = a.value;
        return;
      }

      if (name === "Me") {
        data.profile = {
          dateOfBirth: a.HKCharacteristicTypeIdentifierDateOfBirth || null,
          sex: a.HKCharacteristicTypeIdentifierBiologicalSex || null,
          bloodType: a.HKCharacteristicTypeIdentifierBloodType || null,
        };
        return;
      }

      if (name === "Record") {
        const type = a.type;
        const startDate = a.startDate;
        // Quick date filter — Apple uses "YYYY-MM-DD HH:MM:SS -ZZZZ" format
        if (startDate && startDate < cutoffStr.slice(0, 10)) return;

        // Quantity types
        const bucket = QUANTITY_MAP[type];
        if (bucket) {
          data[bucket].push({
            value: parseFloat(a.value),
            unit: a.unit,
            start: startDate,
            end: a.endDate,
            source: a.sourceName,
          });
          recordCount++;
          return;
        }

        // Category types
        const catBucket = CATEGORY_MAP[type];
        if (catBucket) {
          data[catBucket].push({
            value: a.value,
            start: startDate,
            end: a.endDate,
            source: a.sourceName,
          });
          recordCount++;
          return;
        }
      }

      if (name === "Workout") {
        const startDate = a.startDate;
        if (startDate && startDate < cutoffStr.slice(0, 10)) return;

        data.workouts.push({
          type: a.workoutActivityType?.replace("HKWorkoutActivityType", ""),
          duration: parseFloat(a.duration) || 0,
          durationUnit: a.durationUnit,
          totalEnergy: parseFloat(a.totalEnergyBurned) || 0,
          energyUnit: a.totalEnergyBurnedUnit,
          start: a.startDate,
          end: a.endDate,
          source: a.sourceName,
        });
        recordCount++;
      }
    });

    parser.on("error", (err) => {
      // SAX errors on Apple Health DTD are common; ignore and continue
      parser.resume();
    });

    parser.on("end", () => {
      resolve({ ...data, recordCount });
    });

    stream.on("error", reject);
    stream.pipe(parser);
  });
}
