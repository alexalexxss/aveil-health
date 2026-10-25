import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSampleExportXml } from "../src/sample-data.js";
import { makeZip } from "./helpers/zip.js";

const CLI = fileURLToPath(new URL("../bin/cli.js", import.meta.url));

function run(args) {
  return execFileSync(process.execPath, [CLI, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

test("wrapped and brief work end to end on an export.zip", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "aveil-health-cli-"));
  try {
    const zipPath = path.join(dir, "export.zip");
    writeFileSync(zipPath, makeZip([{ name: "apple_health_export/export.xml", data: buildSampleExportXml({ profile: "mover", days: 70 }) }]));

    run(["wrapped", zipPath, "--output", path.join(dir, "wrapped.html")]);
    assert.match(readFileSync(path.join(dir, "wrapped.html"), "utf8"), /<h1 class="title">Engine<\/h1>/);

    run(["brief", zipPath, "--period", "month", "--output", path.join(dir, "brief.html")]);
    assert.match(readFileSync(path.join(dir, "brief.html"), "utf8"), /Aveil Health Brief/);

    const json = JSON.parse(run(["analyze", zipPath, "--json"]));
    assert.equal(json.sleep.available, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("demo writes every output from synthetic data", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "aveil-health-demo-"));
  try {
    run(["demo", "--output", dir]);
    assert.deepEqual(readdirSync(dir).sort(), [
      "aveil-health-brief-short-sleep.html",
      "aveil-health-brief.html",
      "aveil-sleep-brief.html",
      "aveil-wrapped-mover.html",
      "aveil-wrapped-year.html",
      "aveil-wrapped.html",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a bad --period is a clear error", () => {
  assert.throws(() => run(["wrapped", "export.zip", "--period", "decade"]), /--period must be week, month, or year/);
});
