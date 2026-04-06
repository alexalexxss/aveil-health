#!/usr/bin/env node

/**
 * aveil-health CLI
 * Usage: npx aveil-health analyze export.xml [--days 30] [--json]
 */

import { parseHealthExport } from "../src/parser.js";
import { analyze } from "../src/analyze.js";
import { formatReport, formatJSON } from "../src/format.js";
import { startMcpServer } from "../src/mcp-server.js";
import { generateWrappedHTML } from "../src/wrapped.js";
import { generateAppointmentBriefHTML } from "../src/brief.js";
import { existsSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
  ▲ AVEIL — Private, local Apple Health analysis

  Usage:
    aveil-health analyze <export.xml|export.zip>  [options]
    aveil-health brief <export.xml|export.zip>    [options]
    aveil-health wrapped <export.xml|export.zip>  [options]
    aveil-health demo [output-dir]                 Generate demo cards for all archetypes
    aveil-health mcp                               Start MCP server (stdio)

  Options:
    --days <n>      Number of recent days to analyze (default: 30, wrapped: 365)
    --json          Output raw JSON instead of formatted report
    --period <p>    Wrapped period: yearly, monthly, weekly (default: yearly)
    --output <path> Write HTML output to a specific path
    --open          Open generated HTML in your browser
    --help          Show this help message

  Examples:
    aveil-health analyze ~/Desktop/export.xml
    aveil-health analyze export.zip --days 14
    aveil-health analyze export.xml --json > report.json
    aveil-health brief export.zip --open
    aveil-health brief export.zip --output ~/Desktop/doctor-brief.html
    aveil-health wrapped export.zip --period monthly
    aveil-health wrapped export.zip --period weekly

  MCP Server:
    Set AVEIL_HEALTH_EXPORT=/path/to/export.xml then:
    aveil-health mcp

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

  if (command === "mcp") {
    await startMcpServer();
    return;
  }

  if (command !== "analyze" && command !== "brief" && command !== "wrapped" && command !== "demo") {
    console.error(`Unknown command: ${command}. Use "analyze", "brief", "wrapped", "demo", or "mcp".`);
    printUsage();
    process.exit(1);
  }

  // Demo mode: generate all archetype cards with mock data
  if (command === "demo") {
    const { generateDemoCards } = await import("../src/wrapped.js");
    const outDir = resolve(args[1] || "demo-cards");
    const cards = generateDemoCards(outDir);
    console.log(`\n  ✨ Generated ${cards.length} demo cards in ${outDir}/`);
    for (const c of cards) console.log(`    • ${c}`);
    console.log();
    process.exit(0);
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

  const daysIdx = args.indexOf("--days");
  const periodIdx = args.indexOf("--period");
  const period = periodIdx !== -1 ? args[periodIdx + 1] : null;
  let defaultDays = command === "wrapped" ? 365 : 30;
  if (period === "monthly" || period === "month") defaultDays = 30;
  else if (period === "weekly" || period === "week") defaultDays = 7;
  const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : defaultDays;
  const jsonOutput = args.includes("--json");

  console.log(`\n  Parsing Apple Health export (last ${days} days)...`);
  const startTime = Date.now();

  const data = await parseHealthExport(filePath, { days });
  const parseTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Parsed ${data.recordCount.toLocaleString()} records in ${parseTime}s`);

  const report = analyze(data);

  if (command === "wrapped" || command === "brief") {
    const outputIdx = args.indexOf("--output");
    const generator = command === "wrapped"
      ? () => generateWrappedHTML(report)
      : () => generateAppointmentBriefHTML(report, { days });
    const { html, filename } = generator();
    const outPath = resolve(outputIdx !== -1 ? args[outputIdx + 1] : filename);
    writeFileSync(outPath, html);
    console.log(`\n  ✨ ${command === "wrapped" ? "Card" : "Brief"} saved to ${outPath}`);
    console.log(`  Open in browser to ${command === "wrapped" ? "screenshot and share" : "print, review, or export as PDF"}!\n`);
    if (args.includes("--open")) {
      try {
        execSync(`open "${outPath}"`, { stdio: "ignore" });
      } catch {
        try { execSync(`xdg-open "${outPath}"`, { stdio: "ignore" }); } catch { /* ignore */ }
      }
    }
  } else if (jsonOutput) {
    console.log(formatJSON(report));
  } else {
    console.log(formatReport(report));
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
