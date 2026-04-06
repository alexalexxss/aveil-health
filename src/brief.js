/**
 * Generate an appointment-ready Aveil health brief as self-contained HTML.
 * Clear over pretty: one page you can bring to a doctor, coach, or self-review.
 */

const SIGNAL_ORDER = { warning: 0, neutral: 1, positive: 2 };
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function generateAppointmentBriefHTML(report, options = {}) {
  const today = new Date();
  const todayStamp = today.toISOString().slice(0, 10);
  const days = options.days ?? report.activity?.totalDays ?? report.sleep?.nightsAnalyzed ?? report.recovery?.daysAnalyzed ?? 30;
  const findings = getTopFindings(report);
  const summary = buildSummary(report, findings, days);
  const metricRows = buildMetricRows(report);
  const discussionPoints = buildDiscussionPoints(report, findings);
  const recentWorkouts = formatRecentWorkouts(report.activity?.recentWorkouts || []);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aveil Appointment Brief</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#eef2f7;color:#0f172a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px}
  .page{max-width:980px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ee;border-radius:20px;box-shadow:0 12px 40px rgba(15,23,42,0.08);overflow:hidden}
  .header{padding:32px 36px 24px;border-bottom:1px solid #e2e8f0;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)}
  .eyebrow{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#7c3aed;font-weight:700;margin-bottom:10px}
  .title-row{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;flex-wrap:wrap}
  h1{margin:0;font-size:34px;line-height:1.05;color:#0f172a}
  .subtitle{margin:10px 0 0;font-size:15px;line-height:1.6;color:#475569;max-width:640px}
  .meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
  .chip{display:inline-flex;align-items:center;padding:7px 10px;border-radius:999px;background:#f1f5f9;border:1px solid #dbe3ee;font-size:12px;color:#334155;font-weight:600}
  .score-box{min-width:150px;padding:16px 18px;border-radius:18px;border:1px solid #ddd6fe;background:#faf5ff;text-align:right}
  .score-label{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7c3aed;font-weight:700}
  .score-value{font-size:44px;line-height:1;font-weight:800;margin-top:8px;color:${summary.scoreColor}}
  .score-status{margin-top:6px;font-size:14px;color:#475569;font-weight:600}
  .section{padding:24px 36px;border-top:1px solid #e2e8f0}
  .section-title{margin:0 0 14px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#7c3aed;font-weight:800}
  .summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
  .summary-card{padding:16px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff}
  .summary-card-label{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;font-weight:700;margin-bottom:8px}
  .summary-card-title{font-size:18px;line-height:1.35;font-weight:700;color:#0f172a}
  .summary-card-detail{margin-top:6px;font-size:14px;line-height:1.55;color:#475569}
  table{width:100%;border-collapse:collapse}
  th,td{padding:12px 10px;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:left}
  th{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b}
  td{font-size:14px;color:#0f172a}
  .muted{color:#64748b}
  .trend{font-weight:700;text-transform:capitalize}
  .trend.improving{color:#15803d}
  .trend.declining{color:#b91c1c}
  .trend.stable{color:#0f172a}
  .trend.insufficient_data{color:#64748b}
  .findings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .finding{padding:16px;border-radius:16px;border:1px solid #e2e8f0;background:#ffffff}
  .finding-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  .badge{display:inline-flex;padding:5px 9px;border-radius:999px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;font-weight:800}
  .badge.warning{background:#fef2f2;color:#b91c1c}
  .badge.neutral{background:#fffbeb;color:#a16207}
  .badge.positive{background:#f0fdf4;color:#15803d}
  .finding-title{font-size:17px;line-height:1.35;font-weight:700;margin:0;color:#0f172a}
  .finding-detail{margin-top:8px;font-size:14px;line-height:1.6;color:#475569}
  .finding-move{margin-top:12px;padding-top:12px;border-top:1px dashed #dbe3ee;font-size:13px;line-height:1.5;color:#334155}
  .list{margin:0;padding-left:18px}
  .list li{margin:0 0 10px;font-size:14px;line-height:1.6;color:#334155}
  .footer{padding:20px 36px 28px;border-top:1px solid #e2e8f0;background:#f8fafc}
  .footer p{margin:0;font-size:12px;line-height:1.6;color:#64748b}
  .workouts{margin-top:14px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc}
  .workouts strong{display:block;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px}
  .workouts span{font-size:14px;color:#334155;line-height:1.6}
  @media (max-width: 760px){
    body{padding:0;background:#ffffff}
    .page{border:none;border-radius:0;box-shadow:none}
    .header,.section,.footer{padding-left:20px;padding-right:20px}
    .summary-grid,.findings{grid-template-columns:1fr}
    .score-box{text-align:left;width:100%}
    th:nth-child(4),td:nth-child(4){display:none}
  }
  @media print{
    body{padding:0;background:#ffffff}
    .page{max-width:none;border:none;border-radius:0;box-shadow:none}
    .section{break-inside:avoid}
    .finding{break-inside:avoid}
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="eyebrow">Aveil appointment-ready health brief</div>
      <div class="title-row">
        <div>
          <h1>Apple Health, condensed into one review page.</h1>
          <p class="subtitle">Bring this to a doctor, coach, or your own weekly review. It highlights what looks strong, what needs attention, and what is worth discussing next.</p>
          <div class="meta">
            <span class="chip">${days}-day window</span>
            <span class="chip">Generated ${escapeHtml(formatDate(today))}</span>
            <span class="chip">Source: Apple Health export</span>
            <span class="chip">Local only, no network calls</span>
          </div>
        </div>
        <div class="score-box">
          <div class="score-label">Overall score</div>
          <div class="score-value">${summary.score}</div>
          <div class="score-status">${escapeHtml(summary.scoreStatus)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">What stands out</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-card-label">Primary focus</div>
          <div class="summary-card-title">${escapeHtml(summary.primary.title)}</div>
          <div class="summary-card-detail">${escapeHtml(summary.primary.detail)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Strongest signal</div>
          <div class="summary-card-title">${escapeHtml(summary.strongest.title)}</div>
          <div class="summary-card-detail">${escapeHtml(summary.strongest.detail)}</div>
        </div>
        <div class="summary-card">
          <div class="summary-card-label">Use this brief to</div>
          <div class="summary-card-title">${escapeHtml(summary.useCase.title)}</div>
          <div class="summary-card-detail">${escapeHtml(summary.useCase.detail)}</div>
        </div>
      </div>
      ${recentWorkouts ? `<div class="workouts"><strong>Recent workouts</strong><span>${escapeHtml(recentWorkouts)}</span></div>` : ""}
    </div>

    <div class="section">
      <h2 class="section-title">Key metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Latest</th>
            <th>Baseline</th>
            <th>Trend</th>
            <th>Why it matters</th>
          </tr>
        </thead>
        <tbody>
          ${metricRows.map((row) => `
            <tr>
              <td><strong>${escapeHtml(row.metric)}</strong></td>
              <td>${escapeHtml(row.latest)}</td>
              <td>${escapeHtml(row.baseline)}</td>
              <td><span class="trend ${escapeHtml(row.trendClass)}">${escapeHtml(row.trend)}</span></td>
              <td class="muted">${escapeHtml(row.note)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Priority findings</h2>
      <div class="findings">
        ${findings.map((finding) => `
          <div class="finding">
            <div class="finding-head">
              <h3 class="finding-title">${escapeHtml(finding.title)}</h3>
              <span class="badge ${escapeHtml(finding.level)}">${escapeHtml(finding.level)}</span>
            </div>
            <div class="finding-detail">${escapeHtml(finding.detail)}</div>
            ${finding.move ? `<div class="finding-move"><strong>Next step:</strong> ${escapeHtml(finding.move)}</div>` : ""}
          </div>`).join("")}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Questions to discuss</h2>
      <ul class="list">
        ${discussionPoints.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>

    <div class="footer">
      <p>Generated by aveil-health. This brief is a discussion aid built from Apple Health data, not a diagnosis. If you print it, the layout is optimized for PDF or a single review page.</p>
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    filename: `aveil-brief-${todayStamp}.html`,
  };
}

function buildSummary(report, findings, days) {
  const score = report.overall?.score ?? 0;
  const warning = findings.find((item) => item.level === "warning");
  const positive = findings.find((item) => item.level === "positive");
  const topComponent = [...(report.overall?.components || [])].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const primary = warning
    ? { title: warning.title, detail: warning.detail }
    : findings[0]
    ? { title: findings[0].title, detail: findings[0].detail }
    : { title: "No major issues surfaced", detail: `The last ${days} days look stable enough for a maintenance review.` };

  const strongest = positive
    ? { title: positive.title, detail: positive.detail }
    : topComponent
    ? {
        title: `${capitalize(topComponent.name)} is the strongest area`,
        detail: `${capitalize(topComponent.name)} scored ${topComponent.score}/100 in the current analysis window.`,
      }
    : { title: "Baseline captured", detail: "Use this brief as a starting point for trend tracking over the next few weeks." };

  const useCase = warning
    ? {
        title: "Investigate the constraint, not just the symptom",
        detail: `This is most useful if you want a focused discussion about ${warning.title.toLowerCase()} and what to test next.`,
      }
    : {
        title: "Confirm what is working and keep it durable",
        detail: `If things feel stable, use this to lock in the routines supporting the last ${days} days.`,
      };

  return {
    score,
    scoreColor: score >= 80 ? "#15803d" : score >= 65 ? "#0f172a" : score >= 50 ? "#a16207" : "#b91c1c",
    scoreStatus: score >= 80 ? "Strong baseline" : score >= 65 ? "Mostly solid" : score >= 50 ? "Mixed, worth reviewing" : "Needs attention",
    primary,
    strongest,
    useCase,
  };
}

function buildMetricRows(report) {
  const rows = [];

  if (report.sleep?.available) {
    const lastNight = report.sleep.lastNight;
    const averages = report.sleep.averages || {};
    rows.push({
      metric: "Sleep duration",
      latest: lastNight ? `${formatHours(lastNight.totalMinutes)} last night` : "—",
      baseline: averages.durationMinutes ? `${formatHours(averages.durationMinutes)} average` : "—",
      trend: formatTrend(report.sleep.trend),
      trendClass: trendClass(report.sleep.trend),
      note: "Seven to nine hours is the cleanest baseline for recovery and cognition.",
    });
    rows.push({
      metric: "Deep sleep",
      latest: lastNight ? `${formatMinutes(lastNight.deepMinutes)} last night` : "—",
      baseline: numberOrDash(averages.deepMinutes, (value) => `${value}m average`),
      trend: formatTrend(report.sleep.trend),
      trendClass: trendClass(report.sleep.trend),
      note: "Below roughly 45 minutes repeatedly is worth discussing if symptoms match.",
    });
    rows.push({
      metric: "Bedtime consistency",
      latest: lastNight?.sleepStart ? formatClock(lastNight.sleepStart) : "—",
      baseline: averages.bedtimeHour != null
        ? `${formatHour(averages.bedtimeHour)} average, ±${Math.round((averages.bedtimeVariability || 0) * 60)}m`
        : "—",
      trend: formatTrend(report.sleep.trend),
      trendClass: trendClass(report.sleep.trend),
      note: "Consistency matters because circadian drift quietly degrades sleep quality.",
    });
  }

  if (report.recovery?.available) {
    rows.push({
      metric: "Recovery / HRV",
      latest: numberOrDash(report.recovery.latestHRV, (value) => `${value}ms latest`),
      baseline: numberOrDash(report.recovery.averageHRV, (value) => `${value}ms average · score ${report.recovery.recoveryScore}/100`),
      trend: formatTrend(report.recovery.trend),
      trendClass: trendClass(report.recovery.trend),
      note: "HRV is a useful recovery/stress proxy, especially when viewed against your own baseline.",
    });
    rows.push({
      metric: "Resting heart rate",
      latest: "—",
      baseline: numberOrDash(report.recovery.averageRHR, (value) => `${value} bpm average`),
      trend: formatTrend(report.recovery.trend),
      trendClass: trendClass(report.recovery.trend),
      note: "Lower is often better when it stays aligned with training, sleep, and symptoms.",
    });
  }

  if (report.activity?.available) {
    rows.push({
      metric: "Daily movement",
      latest: report.activity.lastDay ? `${(report.activity.lastDay.steps || 0).toLocaleString()} steps today` : "—",
      baseline: numberOrDash(report.activity.averages?.stepsPerDay, (value) => `${value.toLocaleString()} steps/day average`),
      trend: formatTrend(report.activity.trend),
      trendClass: trendClass(report.activity.trend),
      note: "Roughly seven thousand daily steps is a meaningful health floor for most adults.",
    });
    rows.push({
      metric: "Active energy",
      latest: report.activity.lastDay ? `${report.activity.lastDay.activeEnergy || 0} kcal today` : "—",
      baseline: numberOrDash(report.activity.averages?.activeEnergyPerDay, (value) => `${value} kcal/day average`),
      trend: formatTrend(report.activity.trend),
      trendClass: trendClass(report.activity.trend),
      note: "Useful as a rough training and workload proxy, not a precision calorie target.",
    });
  }

  if (report.nutrition?.available) {
    rows.push({
      metric: "Protein intake",
      latest: "—",
      baseline: numberOrDash(report.nutrition.averages?.proteinPerDay, (value) => `${value} g/day average`),
      trend: formatTrend("insufficient_data"),
      trendClass: trendClass("insufficient_data"),
      note: "Protein is worth reviewing if recovery, appetite, or body composition is a goal.",
    });
  }

  if (!rows.length) {
    rows.push({
      metric: "Data coverage",
      latest: "—",
      baseline: "No core metrics found",
      trend: formatTrend("insufficient_data"),
      trendClass: trendClass("insufficient_data"),
      note: "Try a longer date window if your recent export is sparse.",
    });
  }

  return rows;
}

function getTopFindings(report) {
  const signals = [...(report.signals || [])]
    .sort((a, b) => (SIGNAL_ORDER[a.level] ?? 99) - (SIGNAL_ORDER[b.level] ?? 99))
    .slice(0, 4)
    .map((signal) => ({
      level: signal.level || "neutral",
      title: signal.title,
      detail: signal.detail,
      move: signal.moves?.[0] || "",
      type: signal.type,
    }));

  if (signals.length) return signals;

  const recommendations = [...(report.recommendations || [])]
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))
    .slice(0, 3)
    .map((rec) => ({
      level: rec.priority === "high" ? "warning" : rec.priority === "medium" ? "neutral" : "positive",
      title: rec.title,
      detail: rec.detail,
      move: "",
      type: rec.type,
    }));

  return recommendations.length
    ? recommendations
    : [{
        level: "neutral",
        title: "Baseline captured",
        detail: "The export parsed cleanly, but there were not enough explicit signals to prioritize beyond the core metrics.",
        move: "Use the key metrics table as the review starting point.",
        type: "baseline",
      }];
}

function buildDiscussionPoints(report, findings) {
  const points = [];

  for (const finding of findings) {
    const point = discussionPromptForFinding(report, finding);
    if (point && !points.includes(point)) points.push(point);
    if (points.length === 3) break;
  }

  if (!points.length && report.recommendations?.length) {
    points.push(...report.recommendations.slice(0, 3).map((item) => item.detail));
  }

  if (!points.length) {
    points.push("What is the single metric here that deserves the most attention over the next two weeks?");
    points.push("What change would be easiest to test first instead of trying to fix everything at once?");
    points.push("What should improve if the current plan is working, and when should it be rechecked?");
  }

  return points.slice(0, 3);
}

function discussionPromptForFinding(report, finding) {
  switch (finding.type) {
    case "sleep_quality":
      return `Sleep was ${report.sleep?.lastNight ? formatHours(report.sleep.lastNight.totalMinutes) : "below target"} last night. If that keeps repeating, what is the first thing to change or rule out?`;
    case "deep_sleep_deficit":
      return `Deep sleep is averaging ${report.sleep?.averages?.deepMinutes ?? "low"} minutes. If symptoms match, what should be investigated first: schedule, stress, reflux, alcohol, temperature, or something else?`;
    case "recovery_readiness":
      return `Recovery is ${report.recovery?.recoveryScore ?? "—"}/100 with HRV around ${report.recovery?.averageHRV ?? "—"}ms. Does the current training or stress load make sense given that baseline?`;
    case "low_activity":
      return `Movement is averaging ${(report.activity?.averages?.stepsPerDay || 0).toLocaleString()} steps/day. What is a realistic floor for low-energy or busy days?`;
    case "protein_low":
      return `Protein is averaging ${report.nutrition?.averages?.proteinPerDay ?? "—"}g/day. Is that enough for current recovery or body-composition goals?`;
    default:
      if (finding.level === "warning") {
        return `The main watchout is ${finding.title.toLowerCase()}. What would you want to test or monitor next rather than guessing?`;
      }
      if (finding.level === "neutral") {
        return `This is worth monitoring: ${finding.title.toLowerCase()}. What would confirm it is improving versus drifting the wrong way?`;
      }
      return `What routine or input is most likely driving the positive result in ${finding.title.toLowerCase()}, and how do we keep it stable?`;
  }
}

function formatRecentWorkouts(workouts) {
  if (!workouts.length) return "";
  return workouts
    .slice(-3)
    .map((workout) => `${humanizeWorkoutType(workout.type)} (${workout.duration} min)`)
    .join(" · ");
}

function humanizeWorkoutType(value) {
  if (!value) return "Workout";
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function formatHours(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  return `${Math.round(minutes)}m`;
}

function formatClock(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatHour(value) {
  if (!Number.isFinite(value)) return "—";
  const normalized = value >= 24 ? value - 24 : value;
  const hours = Math.floor(normalized);
  const minutes = Math.round((normalized - hours) * 60);
  const period = hours >= 12 ? "PM" : "AM";
  const display = hours > 12 ? hours - 12 : hours || 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatTrend(value) {
  if (!value || value === "insufficient_data") return "Limited data";
  return capitalize(value);
}

function trendClass(value) {
  if (!value || value === "insufficient_data") return "insufficient_data";
  return value;
}

function capitalize(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function numberOrDash(value, formatter) {
  if (value == null || Number.isNaN(value)) return "—";
  return formatter(value);
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}
