#!/usr/bin/env node

/**
 * aveil-health CLI
 * Usage: npx aveil-health <command> export.zip [options]
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseHealthExport, parseHealthExportXml } from "../src/parser.js";
import { analyze } from "../src/analyze.js";
import { formatReport } from "../src/format.js";
import { buildPeriodSummary } from "../src/summary.js";
import { generateWrappedHTML } from "../src/wrapped.js";
import {
  generateHealthConsultBriefHTML,
  generateSleepConsultBriefHTML,
} from "../src/brief.js";
import { buildSampleExportXml } from "../src/sample-data.js";

const PERIOD_DAYS = { week: 7, month: 30, year: 365 };
const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  ▲ AVEIL · Private, local Apple Health analysis

  Usage:
    aveil-health wrapped <export.zip|export.xml> [--period week|month|year] [--output file.html] [--open]
    aveil-health brief <export.zip|export.xml> [--period week|month|year] [--output file.html] [--open]
    aveil-health sleep-brief <export.zip|export.xml> [--period week|month|year] [--output file.html] [--open]
    aveil-health analyze <export.zip|export.xml> [--days N] [--json]
    aveil-health demo [--output dir] [--open]

  --days N works everywhere in place of --period (default: 30 days).

  Examples:
    npx aveil-health wrapped export.zip
    npx aveil-health wrapped export.zip --period year
    npx aveil-health brief export.zip --output health-brief.html
    npx aveil-health analyze export.zip --days 14 --json > report.json
    npx aveil-health demo --output ./aveil-demo
  `);
}

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

const command = args[0];
const input = args[1] && !args[1].startsWith("--") ? args[1] : null;
if (command !== "demo" && !input) {
  console.error("Missing input file.");
  printUsage();
  process.exit(1);
}

function optionValue(name) {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : undefined;
}

function resolveDays() {
  const period = optionValue("--period");
  if (period !== undefined) {
    if (!PERIOD_DAYS[period]) throw new Error(`--period must be week, month, or year (got "${period}").`);
    return PERIOD_DAYS[period];
  }
  const rawDays = optionValue("--days");
  if (rawDays === undefined) return 30;
  const days = Number(rawDays);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("--days must be a whole number from 1 to 3650.");
  return days;
}

const asJson = args.includes("--json");
const outputPath = optionValue("--output") ?? null;
const shouldOpen = args.includes("--open");

function resolveOutputPath(requestedPath, fallbackFilename) {
  return requestedPath
    ? path.resolve(requestedPath)
    : path.join(process.cwd(), fallbackFilename);
}

function writeOutput(targetPath, html) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, html, "utf8");
}

function openFile(filePath) {
  const opener = process.platform === "darwin" ? ["open", [filePath]]
    : process.platform === "win32" ? ["cmd", ["/c", "start", "", filePath]]
      : ["xdg-open", [filePath]];
  try {
    execFileSync(opener[0], opener[1], { stdio: "ignore" });
  } catch (error) {
    console.warn(`Could not open ${filePath}: ${error.message}`);
  }
}

// Cards compare this period with the one before it, so read twice the
// window plus the unfinished export day.
async function loadSummary(file, days) {
  const data = await parseHealthExport(file, { days: days * 2 + 2, heartRate: false });
  return buildPeriodSummary(data, { days });
}

try {
  if (command === "analyze") {
    const days = resolveDays();
    console.error(`\n🔍 Analyzing Apple Health export (${days} days)...`);
    const data = await parseHealthExport(input, { days });
    const report = analyze(data);

    if (asJson) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      process.stdout.write(formatReport(report));
    }
  } else if (command === "wrapped") {
    const days = resolveDays();
    console.log(`\n🎴 Making your Aveil Wrapped card (last ${days} days)...`);
    const summary = await loadSummary(input, days);
    const { html, filename } = generateWrappedHTML(summary, { generatedAt: new Date() });
    const targetPath = resolveOutputPath(outputPath, filename);
    writeOutput(targetPath, html);
    console.log(`\n✨ Wrapped card saved to ${targetPath}`);
    if (shouldOpen) openFile(targetPath);
  } else if (command === "brief" || command === "sleep-brief") {
    const days = resolveDays();
    const isSleepBrief = command === "sleep-brief";
    console.log(`\n✨ Making your ${isSleepBrief ? "sleep and recovery" : "health"} brief (last ${days} days)...`);
    const summary = await loadSummary(input, days);
    const generator = isSleepBrief ? generateSleepConsultBriefHTML : generateHealthConsultBriefHTML;
    const { html, filename } = generator(summary, { generatedAt: new Date() });
    const targetPath = resolveOutputPath(outputPath, filename);
    writeOutput(targetPath, html);
    console.log(`\n✨ Brief saved to ${targetPath}`);
    if (shouldOpen) openFile(targetPath);
  } else if (command === "demo") {
    console.log(`\n🎴 Making demo outputs from a synthetic Apple Health export (no real data)...`);
    const targetDir = outputPath ? path.resolve(outputPath) : path.join(process.cwd(), "aveil-demo");
    const files = await generateDemo(targetDir);
    console.log(`\n✨ Demo files saved to ${targetDir}`);
    for (const file of files) {
      console.log(`   • ${file}`);
    }
    if (shouldOpen && files.length > 0) openFile(path.join(targetDir, files[0]));
  } else {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }
} catch (error) {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
}

async function generateDemo(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  const outputs = [
    { file: "aveil-wrapped.html", profile: "steady", days: 30, make: generateWrappedHTML },
    { file: "aveil-wrapped-year.html", profile: "steady", days: 365, make: generateWrappedHTML },
    { file: "aveil-wrapped-mover.html", profile: "mover", days: 30, make: generateWrappedHTML },
    { file: "aveil-health-brief.html", profile: "steady", days: 30, make: generateHealthConsultBriefHTML },
    { file: "aveil-health-brief-short-sleep.html", profile: "short_sleep", days: 30, make: generateHealthConsultBriefHTML },
    { file: "aveil-sleep-brief.html", profile: "steady", days: 30, make: generateSleepConsultBriefHTML },
  ];
  const cache = new Map();
  for (const output of outputs) {
    const key = `${output.profile}:${output.days}`;
    if (!cache.has(key)) {
      const xml = buildSampleExportXml({ profile: output.profile, days: output.days * 2 + 10 });
      const data = await parseHealthExportXml(xml, { days: output.days * 2 + 2, heartRate: false });
      cache.set(key, buildPeriodSummary(data, { days: output.days }));
    }
    const { html } = output.make(cache.get(key), { generatedAt: new Date() });
    fs.writeFileSync(path.join(targetDir, output.file), html, "utf8");
  }
  return outputs.map((output) => output.file);
}
