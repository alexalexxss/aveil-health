import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { openExportStream, parseHealthExport, parseHealthExportXml } from "../src/parser.js";
import { makeZip } from "./helpers/zip.js";
import { exportXml, quantity } from "./helpers/xml.js";

const xml = exportXml({
  records: [
    quantity("StepCount", 4000, "2026-10-23 10:00:00 -0500"),
    quantity("StepCount", 1200, "2026-10-24 07:00:00 -0500"),
    quantity("HeartRate", 61, "2026-10-23 10:00:00 -0500", { unit: "count/min" }),
  ],
});

async function withTempDir(run) {
  const dir = mkdtempSync(path.join(tmpdir(), "aveil-health-test-"));
  try {
    return await run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("reads export.xml from inside the zip the Health app makes", async () => {
  await withTempDir(async (dir) => {
    const zipPath = path.join(dir, "export.zip");
    writeFileSync(zipPath, makeZip([
      { name: "apple_health_export/export_cda.xml", data: "<ClinicalDocument/>" },
      { name: "apple_health_export/export.xml", data: xml },
    ]));
    const fromZip = await parseHealthExport(zipPath);
    const fromText = await parseHealthExportXml(xml);
    assert.equal(fromZip.recordCount, 3);
    assert.deepEqual(fromZip.steps, fromText.steps);
    assert.equal(fromZip.exportDate, "2026-10-24 08:00:00 -0500");
  });
});

test("reads an uncompressed zip entry too", async () => {
  await withTempDir(async (dir) => {
    const zipPath = path.join(dir, "export.zip");
    writeFileSync(zipPath, makeZip([{ name: "apple_health_export/export.xml", data: xml, store: true }]));
    const data = await parseHealthExport(zipPath);
    assert.equal(data.steps.length, 2);
  });
});

test("explains what to do when a zip has no export.xml", async () => {
  await withTempDir(async (dir) => {
    const zipPath = path.join(dir, "photos.zip");
    writeFileSync(zipPath, makeZip([{ name: "notes.txt", data: "hello" }]));
    await assert.rejects(parseHealthExport(zipPath), /No export\.xml found in this zip/);
  });
});

test("rejects a file that is not an export", async () => {
  await withTempDir(async (dir) => {
    const filePath = path.join(dir, "notes.txt");
    writeFileSync(filePath, "just some notes");
    await assert.rejects(parseHealthExport(filePath), /not an Apple Health export/);
  });
});

test("counts the window back from the export date, not from today", async () => {
  const old = exportXml({
    exportDate: "2020-03-10 09:00:00 -0500",
    records: [
      quantity("StepCount", 5000, "2020-03-09 12:00:00 -0500"),
      quantity("StepCount", 5000, "2020-01-01 12:00:00 -0500"),
    ],
  });
  const data = await parseHealthExportXml(old, { days: 30 });
  assert.equal(data.steps.length, 1);
  assert.equal(data.steps[0].start, "2020-03-09 12:00:00 -0500");
});

test("can skip raw heart-rate samples", async () => {
  const data = await parseHealthExportXml(xml, { heartRate: false });
  assert.equal(data.heartRate.length, 0);
  assert.equal(data.steps.length, 2);
});

test("rejected zip reads do not leave files open", async () => {
  const fdDir = process.platform === "linux" ? "/proc/self/fd" : "/dev/fd";
  const { readdirSync } = await import("node:fs");
  await withTempDir(async (dir) => {
    const zipPath = path.join(dir, "export.zip");
    // Large enough that reading stops mid-file, before the stream can end on its own.
    writeFileSync(zipPath, makeZip([{ name: "apple_health_export/export.xml", data: "not xml at all ".repeat(200000) }]));
    const before = readdirSync(fdDir).length;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      await assert.rejects(parseHealthExport(zipPath), /not an Apple Health export/);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(readdirSync(fdDir).length <= before + 2, "file descriptors leaked");
  });
});

test("closing a zip stream without an error still releases the archive", async () => {
  const fdDir = process.platform === "linux" ? "/proc/self/fd" : "/dev/fd";
  const { readdirSync } = await import("node:fs");
  await withTempDir(async (dir) => {
    const zipPath = path.join(dir, "export.zip");
    writeFileSync(zipPath, makeZip([{ name: "apple_health_export/export.xml", data: xml.repeat(2000) }]));
    const before = readdirSync(fdDir).length;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const stream = await openExportStream(zipPath);
      stream.destroy();
      await new Promise((resolve) => stream.once("close", resolve));
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(readdirSync(fdDir).length <= before + 2, "file descriptors leaked");
  });
});
