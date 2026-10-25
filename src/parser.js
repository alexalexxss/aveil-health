/**
 * Streaming Apple Health export parser.
 * Reads export.xml directly or from the export.zip the Health app makes,
 * without loading multi-GB files into memory.
 */
import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Readable } from "node:stream";
import { StringDecoder } from "node:string_decoder";

const require = createRequire(import.meta.url);
const sax = require("sax");
const yauzl = require("yauzl");

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

/**
 * Parse an Apple Health export (export.xml or the export.zip that contains it).
 * @param {string} inputPath - Path to export.xml or export.zip
 * @param {object} [opts] - Options
 * @param {number} [opts.days=30] - Days of history to keep, counted back from the export date
 * @param {boolean} [opts.heartRate=true] - Keep raw heart-rate samples (large, and the cards do not use them)
 * @returns {Promise<HealthData>}
 */
export async function parseHealthExport(inputPath, opts = {}) {
  const stream = await openExportStream(inputPath);
  return parseHealthExportStream(stream, opts);
}

/**
 * Parse export.xml text that is already in memory (used by the demo and tests).
 */
export function parseHealthExportXml(xml, opts = {}) {
  return parseHealthExportStream(Readable.from([xml]), opts);
}

/**
 * Open export.xml for streaming. A .zip is read in place: the export.xml
 * entry is inflated as it streams and is never written to disk.
 */
export async function openExportStream(inputPath) {
  if (await isZipFile(inputPath)) {
    return openZipExportEntry(inputPath);
  }
  return createReadStream(inputPath);
}

async function isZipFile(inputPath) {
  const handle = await open(inputPath, "r");
  try {
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, 4, 0);
    return bytesRead === 4 && header.readUInt32LE(0) === 0x04034b50;
  } finally {
    await handle.close();
  }
}

function openZipExportEntry(zipPath) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (openError, zip) => {
      if (openError) {
        reject(new Error(`Could not read ${path.basename(zipPath)} as a zip file (${openError.message}).`));
        return;
      }

      let fallback = null;
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(error);
      };
      const finish = (entry) => {
        if (settled) return;
        if (!entry) {
          fail(new Error("No export.xml found in this zip. In the Health app, tap your picture, then Export All Health Data."));
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) {
            fail(streamError);
            return;
          }
          settled = true;
          let closed = false;
          const closeZip = () => {
            if (closed) return;
            closed = true;
            zip.close();
          };
          stream.once("end", closeZip);
          stream.once("close", closeZip);
          stream.once("error", closeZip);
          resolve(stream);
        });
      };

      zip.on("error", fail);
      zip.on("entry", (entry) => {
        const name = entry.fileName;
        const base = path.posix.basename(name).toLowerCase();
        const usable = !name.endsWith("/") && !name.startsWith("__MACOSX/");
        if (usable && base === "export.xml") {
          finish(entry);
          return;
        }
        // Some exports rename the file. Fall back to the largest other .xml
        // that is not the clinical-records (CDA) file.
        if (usable && base.endsWith(".xml") && !base.includes("cda")
          && (!fallback || entry.uncompressedSize > fallback.uncompressedSize)) {
          fallback = entry;
        }
        zip.readEntry();
      });
      zip.on("end", () => finish(fallback));
      zip.readEntry();
    });
  });
}

/**
 * Parse an export.xml byte or text stream.
 * Records older than the window are skipped while reading. The window is
 * counted back from the export's own date, so an older export still gives
 * its last N days instead of nothing.
 */
export async function parseHealthExportStream(stream, opts = {}) {
  const days = opts.days ?? 30;
  const keepHeartRate = opts.heartRate !== false;

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

  let recordCount = 0;
  let cutoffDay = null;
  let sawElement = false;

  const ensureCutoff = () => {
    if (cutoffDay) return;
    const anchor = localDay(data.exportDate);
    const base = anchor ? new Date(`${anchor}T00:00:00Z`) : new Date();
    base.setUTCDate(base.getUTCDate() - days);
    cutoffDay = base.toISOString().slice(0, 10);
  };

  const parser = sax.parser(true, { trim: true });

  parser.onopentag = (node) => {
    const { name, attributes: a } = node;
    sawElement = true;

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
      ensureCutoff();
      const type = a.type;
      const startDate = a.startDate;
      // Apple writes "YYYY-MM-DD HH:MM:SS -ZZZZ", so the date prefix compares as text.
      if (startDate && startDate.slice(0, 10) < cutoffDay) return;

      const bucket = QUANTITY_MAP[type];
      if (bucket) {
        if (bucket === "heartRate" && !keepHeartRate) return;
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

      const catBucket = CATEGORY_MAP[type];
      if (catBucket) {
        data[catBucket].push({
          value: a.value,
          start: startDate,
          end: a.endDate,
          source: a.sourceName,
        });
        recordCount++;
      }
      return;
    }

    if (name === "Workout") {
      ensureCutoff();
      const startDate = a.startDate;
      if (startDate && startDate.slice(0, 10) < cutoffDay) return;

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
  };

  // The Health app's DTD and odd characters in device names can trip strict
  // XML checks. Skip the broken bit and keep reading.
  parser.onerror = () => {
    parser.error = null;
    parser.resume();
  };

  const decoder = new StringDecoder("utf8");
  let checkedStart = false;
  try {
    for await (const chunk of stream) {
      const text = typeof chunk === "string" ? chunk : decoder.write(chunk);
      if (!checkedStart && text.trim()) {
        checkedStart = true;
        if (!text.trimStart().startsWith("<")) {
          throw new Error("This file is not an Apple Health export. Use the export.zip from the Health app, or the export.xml inside it.");
        }
      }
      parser.write(text);
    }
    parser.write(decoder.end());
    parser.close();
  } finally {
    // Leaving the loop early (an error above, or a parser failure) must still
    // release the file and the zip archive.
    if (typeof stream.destroy === "function" && !stream.destroyed) stream.destroy();
  }

  if (!sawElement) {
    throw new Error("This file is empty or not an Apple Health export.");
  }

  return { ...data, recordCount };
}

function localDay(stamp) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(stamp || ""));
  return match ? match[1] : null;
}
