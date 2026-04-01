#!/usr/bin/env node

/**
 * aveil-health CLI
 * Usage: npx aveil-health analyze export.xml [--days 30] [--json]
 */

import { parseHealthExport } from "../src/parser.js";
import { analyze } from "../src/analyze.js";
import { formatReport, formatJSON } from "../src/format.js";
import { existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  ▲ AVEIL — Private, local Apple Health analysis

  Usage:
    aveil-health analyze <export.xml|export.zip>  [options]

  Options:
    --days <n>    Number of recent days to analyze (default: 30)
    --json        Output raw JSON instead of formatted report
    --help        Show this help message

  Examples:
    aveil-health analyze ~/Desktop/export.xml
    aveil-health analyze export.zip --days 14
    aveil-health analyze export.xml --json > report.json

  Your data never leaves your machine.
  https://aveilx.com
`);
}

async function main() {
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  if (command !== "analyze") {
    console.error(`Unknown command: ${command}. Use "analyze".`);
    printUsage();
    process.exit(1);
  }

  let filePath = args[1];
  if (!filePath) {
    console.error("Error: Please provide a path to your Apple Health export.xml or export.zip");
    process.exit(1);
  }

  filePath = resolve(filePath);

  // Handle zip files
  if (extname(filePath) === ".zip") {
    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    console.log("  Extracting zip...");
    const tmpDir = `/tmp/aveil-health-${Date.now()}`;
    execSync(`mkdir -p ${tmpDir} && unzip -o "${filePath}" -d ${tmpDir}`, { stdio: "pipe" });
    // Find export.xml inside
    const xmlPath = `${tmpDir}/apple_health_export/export.xml`;
    if (!existsSync(xmlPath)) {
      console.error("Could not find export.xml inside the zip file.");
      process.exit(1);
    }
    filePath = xmlPath;
  }

  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const days = parseInt(args[args.indexOf("--days") + 1]) || 30;
  const jsonOutput = args.includes("--json");

  console.log(`\n  Parsing Apple Health export (last ${days} days)...`);
  const startTime = Date.now();

  const data = await parseHealthExport(filePath, { days });
  const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Parsed ${data.recordCount.toLocaleString()} records in ${parseTime}s`);

  const report = analyze(data);

  if (jsonOutput) {
    console.log(formatJSON(report));
  } else {
    console.log(formatReport(report));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
