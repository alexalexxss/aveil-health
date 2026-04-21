#!/usr/bin/env node

/**
 * aveil-health CLI
 * Usage: npx aveil-health analyze export.xml [--days 30] [--json]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { parseHealthExport } from "../src/parser.js";
import { analyze } from "../src/analyze.js";
import { formatReport } from "../src/format.js";
import { generateDemoCards, generateWrappedHTML } from "../src/wrapped.js";
import {
  generateHealthConsultBriefHTML,
  generateSleepConsultBriefHTML,
} from "../src/brief.js";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  ▲ AVEIL — Private, local Apple Health analysis

  Usage:
    aveil-health analyze <export.xml|export.zip> [--days N] [--json]
    aveil-health wrapped <export.xml|export.zip> [--days N] [--output file.html] [--open]
    aveil-health brief <export.xml|export.zip> [--output file.html] [--open]
    aveil-health sleep-brief <export.xml|export.zip> [--output file.html] [--open]
    aveil-health demo [--output dir] [--open]

  Examples:
    npx aveil-health analyze export.xml
    npx aveil-health analyze export.zip --days 14
    npx aveil-health analyze export.xml --json > report.json
    npx aveil-health wrapped export.zip
    npx aveil-health wrapped export.zip --days 365
    npx aveil-health wrapped export.zip --output wrapped-card.html
    npx aveil-health brief export.zip
    npx aveil-health brief export.zip --output health-consult-brief.html
    npx aveil-health sleep-brief export.zip --output sleep-recovery-brief.html
    npx aveil-health demo --output ./demo-cards
  `);
}

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(0);
}

const command = args[0];
const input = args[1];
if (command !== "demo" && !input) {
  console.error("Missing input file.");
  printUsage();
  process.exit(1);
}

const daysIdx = args.indexOf("--days");
const days = daysIdx !== -1 ? Number(args[daysIdx + 1]) : 30;
const asJson = args.includes("--json");
const outputIdx = args.indexOf("--output");
const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;
const shouldOpen = args.includes("--open");

function resolveOutputPath(requestedPath, fallbackFilename) {
  return requestedPath
    ? path.resolve(requestedPath)
    : path.join(process.cwd(), fallbackFilename);
}

function openFile(filePath) {
  try {
    execSync(`open ${JSON.stringify(filePath)}`);
  } catch (error) {
    console.warn(`⚠️ Could not open ${filePath}: ${error.message}`);
  }
}

try {
  if (command === "analyze") {
    console.log(`
🔍 Analyzing Apple Health export (${days} days)...`);
    const data = await parseHealthExport(input, { days });
    const report = analyze(data);

    if (asJson) {
      process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    } else {
      process.stdout.write(formatReport(report));
    }
  } else if (command === "wrapped") {
    console.log(`
🎴 Generating Wrapped card from Apple Health export...`);
    const data = await parseHealthExport(input, { days });
    const report = analyze(data);
    const { html, filename } = generateWrappedHTML(report, { generatedAt: new Date(), days });

    const targetPath = resolveOutputPath(outputPath, filename);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, html, "utf8");

    console.log(`\n✨ Wrapped card saved to ${targetPath}`);
    if (shouldOpen) {
      openFile(targetPath);
    }
  } else if (command === "brief" || command === "sleep-brief") {
    const isSleepBrief = command === "sleep-brief";
    console.log(`\n✨ Generating ${isSleepBrief ? "sleep/recovery" : "health"} consult brief from Apple Health export...`);
    const data = await parseHealthExport(input, { days });
    const report = analyze(data);
    const generator = isSleepBrief ? generateSleepConsultBriefHTML : generateHealthConsultBriefHTML;
    const { html, filename } = generator(report, { generatedAt: new Date(), days });

    const targetPath = resolveOutputPath(outputPath, filename);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, html, "utf8");

    console.log(`\n✨ Brief saved to ${targetPath}`);
    if (shouldOpen) {
      openFile(targetPath);
    }
  } else if (command === "demo") {
    console.log(`\n🎴 Generating demo Wrapped cards...`);
    const targetDir = outputPath ? path.resolve(outputPath) : path.join(process.cwd(), "aveil-demo");
    const files = generateDemoCards(targetDir);

    console.log(`\n✨ Demo cards saved to ${targetDir}`);
    for (const file of files) {
      console.log(`   • ${file}`);
    }

    if (shouldOpen && files.length > 0) {
      openFile(path.join(targetDir, files[0]));
    }
  } else {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(1);
  }
} catch (error) {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
}
