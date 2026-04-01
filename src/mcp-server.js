#!/usr/bin/env node

/**
 * aveil-health MCP Server
 *
 * Provides Apple Health analysis tools to MCP clients
 * (Claude Code, Cursor, etc.) via stdio transport.
 *
 * Usage in MCP config:
 *   {
 *     "mcpServers": {
 *       "aveil-health": {
 *         "command": "npx",
 *         "args": ["aveil-health", "mcp"],
 *         "env": {
 *           "AVEIL_HEALTH_EXPORT": "/path/to/export.xml"
 *         }
 *       }
 *     }
 *   }
 *
 * All analysis runs locally. No network calls.
 */

import { parseHealthExport } from "./parser.js";
import { analyze } from "./analyze.js";
import { createInterface } from "node:readline";
import { existsSync } from "node:fs";

// ─── MCP Protocol Constants ───

const JSONRPC_VERSION = "2.0";
const MCP_PROTOCOL_VERSION = "2024-11-05";

const SERVER_INFO = {
  name: "aveil-health",
  version: "0.2.0",
};

const SERVER_CAPABILITIES = {
  tools: {},
};

// ─── Tool Definitions ───

const TOOLS = [
  {
    name: "analyze_health",
    description:
      "Run a full health analysis on the loaded Apple Health export. Returns overall score, sleep, recovery, activity, nutrition, and actionable signals. Use this for a comprehensive overview.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_sleep_summary",
    description:
      "Get detailed sleep analysis — last night's breakdown (deep/REM/core/awake), 14-night averages, bedtime consistency, and trends.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_recovery_status",
    description:
      "Get recovery readiness based on HRV, resting heart rate, and sleep quality. Tells you whether to push hard or rest today.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_activity_summary",
    description:
      "Get activity metrics — daily steps, active energy, recent workouts, and trends.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_signals",
    description:
      "Get actionable health signals — specific observations with severity levels (positive/neutral/warning) and concrete next steps. This is the most useful tool for quick decisions.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
  {
    name: "get_recommendations",
    description:
      "Get time-aware recommendations based on current time of day, recovery status, and sleep patterns. Includes training guidance, bedtime reminders, energy management tips, and focus suggestions. Best called periodically throughout the day.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of recent days to analyze (default: 30)",
          default: 30,
        },
      },
    },
  },
];

// ─── Analysis Cache ───

let analysisCache = new Map();

async function getAnalysis(exportPath, days) {
  const key = `${exportPath}:${days}`;
  if (analysisCache.has(key)) return analysisCache.get(key);

  const data = await parseHealthExport(exportPath, { days });
  const report = analyze(data);
  analysisCache.set(key, report);
  return report;
}

// ─── Tool Handlers ───

async function handleTool(name, args, exportPath) {
  const days = args?.days ?? 30;

  if (!existsSync(exportPath)) {
    return {
      content: [
        {
          type: "text",
          text: `Error: Apple Health export not found at: ${exportPath}\n\nSet the AVEIL_HEALTH_EXPORT environment variable to your export.xml or export.zip path.\n\nTo export from iPhone:\n1. Open Health app\n2. Tap profile picture\n3. Export All Health Data\n4. Save the zip file`,
        },
      ],
      isError: true,
    };
  }

  try {
    const report = await getAnalysis(exportPath, days);

    switch (name) {
      case "analyze_health":
        return {
          content: [
            {
              type: "text",
              text: formatFullReport(report),
            },
          ],
        };

      case "get_sleep_summary":
        return {
          content: [
            {
              type: "text",
              text: formatSleepSection(report.sleep),
            },
          ],
        };

      case "get_recovery_status":
        return {
          content: [
            {
              type: "text",
              text: formatRecoverySection(report.recovery),
            },
          ],
        };

      case "get_activity_summary":
        return {
          content: [
            {
              type: "text",
              text: formatActivitySection(report.activity),
            },
          ],
        };

      case "get_signals":
        return {
          content: [
            {
              type: "text",
              text: formatSignalsSection(report.signals),
            },
          ],
        };

      case "get_recommendations":
        return {
          content: [
            {
              type: "text",
              text: formatRecommendationsSection(report.recommendations),
            },
          ],
        };

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Analysis error: ${err.message}` }],
      isError: true,
    };
  }
}

// ─── Markdown Formatters (for MCP text output) ───

function formatFullReport(report) {
  const lines = [];
  lines.push(`## Health Analysis — Overall Score: ${report.overall.score}/100`);
  lines.push("");

  if (report.overall.components.length) {
    lines.push(report.overall.components.map((c) => `**${c.name}** ${c.score}`).join(" · "));
    lines.push("");
  }

  if (report.sleep.available) lines.push(formatSleepSection(report.sleep));
  if (report.recovery.available) lines.push(formatRecoverySection(report.recovery));
  if (report.activity.available) lines.push(formatActivitySection(report.activity));
  if (report.nutrition.available) {
    lines.push("### Nutrition");
    lines.push(`- ${report.nutrition.daysTracked}-day average: **${report.nutrition.averages.caloriesPerDay} kcal** · **${report.nutrition.averages.proteinPerDay}g protein**`);
    lines.push("");
  }
  lines.push(formatSignalsSection(report.signals));
  lines.push(`---`);
  lines.push(`*${report.recordCount.toLocaleString()} records analyzed · aveilx.com*`);

  return lines.join("\n");
}

function formatSleepSection(sleep) {
  if (!sleep.available) return "### Sleep\nNo sleep data available.";

  const lines = ["### Sleep"];
  if (sleep.lastNight) {
    const ln = sleep.lastNight;
    lines.push(`- **Last night:** ${(ln.totalMinutes / 60).toFixed(1)}h total`);
    lines.push(`  - Deep ${ln.deepMinutes}m · REM ${ln.remMinutes}m · Core ${ln.coreMinutes}m · Awake ${ln.awakeMinutes}m`);
  }
  const avg = sleep.averages;
  lines.push(`- **${sleep.nightsAnalyzed}-night average:** ${(avg.durationMinutes / 60).toFixed(1)}h · deep ${avg.deepMinutes}m · REM ${avg.remMinutes}m`);
  lines.push(`- **Avg bedtime:** ${formatHour(avg.bedtimeHour)} · variability ±${(avg.bedtimeVariability * 60).toFixed(0)}min`);
  lines.push(`- **Trend:** ${sleep.trend}`);
  lines.push("");
  return lines.join("\n");
}

function formatRecoverySection(recovery) {
  if (!recovery.available) return "### Recovery\nNo HRV data available.";

  const lines = ["### Recovery"];
  lines.push(`- **Score:** ${recovery.recoveryScore}/100 (${recovery.readiness})`);
  lines.push(`- **HRV:** ${recovery.latestHRV}ms (avg ${recovery.averageHRV}ms)`);
  if (recovery.averageRHR) lines.push(`- **Resting HR:** ${recovery.averageRHR}bpm`);
  lines.push(`- **Trend:** ${recovery.trend}`);

  if (recovery.readiness === "good") {
    lines.push(`- ✅ Good to push — recovery supports hard training today`);
  } else if (recovery.readiness === "moderate") {
    lines.push(`- ⚠️ Moderate — skip maximal efforts`);
  } else {
    lines.push(`- 🔴 Low — prioritize rest and sleep tonight`);
  }
  lines.push("");
  return lines.join("\n");
}

function formatActivitySection(activity) {
  if (!activity.available) return "### Activity\nNo activity data available.";

  const lines = ["### Activity"];
  if (activity.lastDay) {
    lines.push(`- **Latest:** ${activity.lastDay.steps.toLocaleString()} steps · ${activity.lastDay.activeEnergy} kcal`);
  }
  lines.push(`- **${activity.daysAnalyzed}-day average:** ${activity.averages.stepsPerDay.toLocaleString()} steps/day · ${activity.averages.activeEnergyPerDay} kcal/day`);
  if (activity.recentWorkouts.length) {
    const recent = activity.recentWorkouts.slice(-3).map((w) => `${w.type} (${w.duration}min)`).join(", ");
    lines.push(`- **Recent workouts:** ${recent}`);
  }
  lines.push(`- **Trend:** ${activity.trend}`);
  lines.push("");
  return lines.join("\n");
}

function formatSignalsSection(signals) {
  const ICONS = { positive: "✅", neutral: "💡", warning: "⚠️" };
  const lines = ["### Signals"];

  for (const s of signals) {
    const icon = ICONS[s.level] || "💡";
    lines.push(`${icon} **${s.title}**`);
    lines.push(`  ${s.detail}`);
    for (const m of s.moves || []) {
      lines.push(`  → ${m}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function formatRecommendationsSection(recs) {
  if (!recs || !recs.length) {
    return "### Recommendations\nNo time-specific recommendations right now. Check back later.";
  }

  const PRIORITY_ICONS = { high: "🔴", medium: "🟡", low: "🟢" };
  const lines = ["### Recommendations"];
  lines.push(`*Based on current time and your health data*\n`);

  for (const r of recs) {
    const icon = PRIORITY_ICONS[r.priority] || "💡";
    lines.push(`${icon} **${r.title}**`);
    lines.push(`  ${r.detail}`);
    lines.push("");
  }

  return lines.join("\n");
}

function formatHour(h) {
  if (isNaN(h)) return "--:--";
  const norm = h >= 24 ? h - 24 : h;
  const hrs = Math.floor(norm);
  const mins = Math.round((norm - hrs) * 60);
  const period = hrs >= 12 ? "PM" : "AM";
  const display = hrs > 12 ? hrs - 12 : hrs || 12;
  return `${display}:${mins.toString().padStart(2, "0")} ${period}`;
}

// ─── JSON-RPC / MCP Transport ───

function makeResponse(id, result) {
  return JSON.stringify({ jsonrpc: JSONRPC_VERSION, id, result });
}

function makeError(id, code, message) {
  return JSON.stringify({
    jsonrpc: JSONRPC_VERSION,
    id,
    error: { code, message },
  });
}

async function handleMessage(msg, exportPath) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      return makeResponse(id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
      return null; // no response needed

    case "tools/list":
      return makeResponse(id, { tools: TOOLS });

    case "tools/call": {
      const { name, arguments: args } = params;
      const result = await handleTool(name, args, exportPath);
      return makeResponse(id, result);
    }

    case "ping":
      return makeResponse(id, {});

    default:
      if (method?.startsWith("notifications/")) return null;
      return makeError(id, -32601, `Method not found: ${method}`);
  }
}

// ─── Main ───

export async function startMcpServer() {
  const exportPath =
    process.env.AVEIL_HEALTH_EXPORT ||
    process.env.HEALTH_EXPORT_PATH ||
    "./export.xml";

  const rl = createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    try {
      const msg = JSON.parse(line);
      const response = await handleMessage(msg, exportPath);
      if (response) {
        process.stdout.write(response + "\n");
      }
    } catch (err) {
      const errResponse = makeError(null, -32700, `Parse error: ${err.message}`);
      process.stdout.write(errResponse + "\n");
    }
  });

  rl.on("close", () => process.exit(0));
}
