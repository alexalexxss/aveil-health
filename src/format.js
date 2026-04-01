/**
 * Terminal formatter for health analysis reports.
 * Clean, minimal output — inspired by WHOOP/Oura aesthetics.
 */

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgRed: "\x1b[41m",
};

const LEVEL_STYLE = {
  positive: { icon: "✅", color: COLORS.green },
  neutral: { icon: "💡", color: COLORS.yellow },
  warning: { icon: "⚠️", color: COLORS.red },
};

/**
 * Format an analysis report for terminal output.
 * @param {AnalysisReport} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = [];

  // Header
  lines.push("");
  lines.push(`${COLORS.bold}${COLORS.magenta}  ▲ AVEIL${COLORS.reset}  ${COLORS.dim}Health Analysis${COLORS.reset}`);
  lines.push(`${COLORS.dim}  ─────────────────────────────────────${COLORS.reset}`);
  lines.push("");

  // Overall score
  const { score, components } = report.overall;
  const scoreColor = score >= 70 ? COLORS.green : score >= 50 ? COLORS.yellow : COLORS.red;
  lines.push(`${COLORS.bold}  Overall Score: ${scoreColor}${score}/100${COLORS.reset}`);

  if (components.length) {
    const compStr = components.map((c) => `${c.name} ${c.score}`).join(" · ");
    lines.push(`${COLORS.dim}  ${compStr}${COLORS.reset}`);
  }
  lines.push("");

  // Sleep section
  if (report.sleep.available && report.sleep.lastNight) {
    lines.push(sectionHeader("SLEEP"));
    const ln = report.sleep.lastNight;
    const hrs = (ln.totalMinutes / 60).toFixed(1);
    lines.push(`  Last night: ${COLORS.bold}${hrs}h${COLORS.reset} total`);
    lines.push(`  ${COLORS.dim}Deep ${ln.deepMinutes}m · REM ${ln.remMinutes}m · Core ${ln.coreMinutes}m · Awake ${ln.awakeMinutes}m${COLORS.reset}`);
    lines.push("");
    const avg = report.sleep.averages;
    lines.push(`  ${COLORS.dim}14-night avg: ${(avg.durationMinutes / 60).toFixed(1)}h · deep ${avg.deepMinutes}m · REM ${avg.remMinutes}m${COLORS.reset}`);
    lines.push(`  ${COLORS.dim}Avg bedtime: ${formatHour(avg.bedtimeHour)} · variability ±${(avg.bedtimeVariability * 60).toFixed(0)}min${COLORS.reset}`);
    lines.push(`  ${COLORS.dim}Trend: ${trendEmoji(report.sleep.trend)} ${report.sleep.trend}${COLORS.reset}`);
    lines.push("");
  }

  // Recovery section
  if (report.recovery.available) {
    lines.push(sectionHeader("RECOVERY"));
    const r = report.recovery;
    const readColor = r.readiness === "good" ? COLORS.green : r.readiness === "moderate" ? COLORS.yellow : COLORS.red;
    lines.push(`  Score: ${COLORS.bold}${r.recoveryScore}/100${COLORS.reset} (${readColor}${r.readiness}${COLORS.reset})`);
    lines.push(`  HRV: ${COLORS.bold}${r.latestHRV}ms${COLORS.reset} ${COLORS.dim}(avg ${r.averageHRV}ms)${COLORS.reset}`);
    if (r.averageRHR) lines.push(`  RHR: ${COLORS.dim}${r.averageRHR}bpm${COLORS.reset}`);
    lines.push(`  ${COLORS.dim}Trend: ${trendEmoji(r.trend)} ${r.trend}${COLORS.reset}`);
    lines.push("");
  }

  // Activity section
  if (report.activity.available) {
    lines.push(sectionHeader("ACTIVITY"));
    const a = report.activity;
    if (a.lastDay) {
      lines.push(`  Today: ${COLORS.bold}${a.lastDay.steps.toLocaleString()} steps${COLORS.reset} · ${a.lastDay.activeEnergy} kcal`);
    }
    lines.push(`  ${COLORS.dim}14-day avg: ${a.averages.stepsPerDay.toLocaleString()} steps/day · ${a.averages.activeEnergyPerDay} kcal/day${COLORS.reset}`);
    if (a.recentWorkouts.length) {
      lines.push(`  ${COLORS.dim}Recent workouts: ${a.recentWorkouts.slice(-3).map((w) => `${w.type} (${w.duration}min)`).join(", ")}${COLORS.reset}`);
    }
    lines.push(`  ${COLORS.dim}Trend: ${trendEmoji(a.trend)} ${a.trend}${COLORS.reset}`);
    lines.push("");
  }

  // Nutrition section
  if (report.nutrition.available) {
    lines.push(sectionHeader("NUTRITION"));
    const n = report.nutrition;
    lines.push(`  ${COLORS.dim}${n.daysTracked}-day avg: ${n.averages.caloriesPerDay} kcal · ${n.averages.proteinPerDay}g protein${COLORS.reset}`);
    lines.push("");
  }

  // Signals
  if (report.signals.length) {
    lines.push(sectionHeader("SIGNALS"));
    for (const s of report.signals) {
      const style = LEVEL_STYLE[s.level] || LEVEL_STYLE.neutral;
      lines.push(`  ${style.icon} ${style.color}${COLORS.bold}${s.title}${COLORS.reset}`);
      lines.push(`     ${COLORS.dim}${s.detail}${COLORS.reset}`);
      if (s.moves.length) {
        for (const m of s.moves) {
          lines.push(`     ${COLORS.dim}→ ${m}${COLORS.reset}`);
        }
      }
      lines.push("");
    }
  }

  // Recommendations
  if (report.recommendations && report.recommendations.length) {
    lines.push(sectionHeader("RECOMMENDATIONS"));
    const PRIO_STYLE = {
      high: { icon: "🔴", color: COLORS.red },
      medium: { icon: "🟡", color: COLORS.yellow },
      low: { icon: "🟢", color: COLORS.green },
    };
    for (const r of report.recommendations) {
      const style = PRIO_STYLE[r.priority] || PRIO_STYLE.medium;
      lines.push(`  ${style.icon} ${style.color}${COLORS.bold}${r.title}${COLORS.reset}`);
      lines.push(`     ${COLORS.dim}${r.detail}${COLORS.reset}`);
      lines.push("");
    }
  }

  // Footer
  lines.push(`${COLORS.dim}  ─────────────────────────────────────${COLORS.reset}`);
  lines.push(`${COLORS.dim}  ${report.recordCount.toLocaleString()} records analyzed · export ${report.exportDate || "unknown"}${COLORS.reset}`);
  lines.push(`${COLORS.dim}  aveilx.com — health signals you can act on${COLORS.reset}`);
  lines.push("");

  return lines.join("\n");
}

/**
 * Format report as plain JSON.
 */
export function formatJSON(report) {
  return JSON.stringify(report, null, 2);
}

// ─── Helpers ───

function sectionHeader(title) {
  return `${COLORS.bold}${COLORS.cyan}  ■ ${title}${COLORS.reset}`;
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

function trendEmoji(trend) {
  return trend === "improving" ? "📈" : trend === "declining" ? "📉" : "➡️";
}
