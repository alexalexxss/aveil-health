/**
 * Generate a narrow, appointment-ready Aveil sleep & recovery consult brief
 * as self-contained HTML.
 */

export function generateAppointmentBriefHTML(report, options = {}) {
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const days = Number.isFinite(options.days) ? options.days : 30;
  const focus = buildConsultFocus(report, days);
  const metrics = buildMetricRows(report);
  const signals = buildRelevantSignals(report);
  const dateLabel = generatedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aveil sleep & recovery consult brief</title>
<style>
  :root{
    --bg:#f6f4ef;
    --paper:#fffdf8;
    --ink:#16130d;
    --muted:#6f6558;
    --border:#e7decd;
    --accent:#4338ca;
    --accent-soft:#ebe9fe;
    --warn:#92400e;
    --warn-soft:#fff4e5;
    --good:#166534;
    --good-soft:#ecfdf3;
    --bad:#9f1239;
    --bad-soft:#fff1f2;
  }
  *{box-sizing:border-box}
  body{
    margin:0;
    padding:32px;
    background:var(--bg);
    color:var(--ink);
    font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    line-height:1.45;
  }
  .page{
    max-width:980px;
    margin:0 auto;
    background:var(--paper);
    border:1px solid var(--border);
    border-radius:24px;
    padding:36px;
    box-shadow:0 18px 50px rgba(22,19,13,.08);
  }
  .eyebrow{
    font-size:12px;
    font-weight:700;
    letter-spacing:.12em;
    text-transform:uppercase;
    color:var(--accent);
    margin-bottom:10px;
  }
  .hero{
    display:grid;
    grid-template-columns:minmax(0,1.4fr) minmax(260px,.9fr);
    gap:18px;
    align-items:start;
    margin-bottom:24px;
  }
  .hero h1{
    margin:0 0 10px;
    font-size:34px;
    line-height:1.08;
  }
  .hero p{
    margin:0;
    color:var(--muted);
    font-size:15px;
  }
  .hero-card{
    border:1px solid var(--border);
    border-radius:18px;
    padding:18px;
    background:#fff;
  }
  .hero-card h2{
    margin:0 0 10px;
    font-size:15px;
  }
  .hero-card ul{
    margin:0;
    padding-left:18px;
    color:var(--muted);
  }
  .meta-row{
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    margin:14px 0 0;
  }
  .chip{
    display:inline-flex;
    align-items:center;
    gap:6px;
    padding:7px 10px;
    border-radius:999px;
    background:#fff;
    border:1px solid var(--border);
    font-size:12px;
    color:var(--muted);
  }
  .chip strong{color:var(--ink)}
  .focus-grid{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px;
    margin:18px 0 26px;
  }
  .focus-card{
    border:1px solid var(--border);
    border-radius:18px;
    padding:18px;
    background:#fff;
  }
  .focus-card h3{
    margin:0 0 8px;
    font-size:13px;
    letter-spacing:.06em;
    text-transform:uppercase;
    color:var(--muted);
  }
  .focus-card p{
    margin:0;
    font-size:15px;
  }
  .section{
    margin-top:24px;
  }
  .section-title{
    margin:0 0 12px;
    font-size:19px;
  }
  .section-subtitle{
    margin:-2px 0 14px;
    color:var(--muted);
    font-size:14px;
  }
  .signal-list{
    display:grid;
    gap:12px;
  }
  .signal-card{
    border:1px solid var(--border);
    border-radius:16px;
    padding:16px;
    background:#fff;
  }
  .signal-top{
    display:flex;
    justify-content:space-between;
    gap:12px;
    align-items:flex-start;
    margin-bottom:6px;
  }
  .signal-title{
    font-size:16px;
    font-weight:700;
    margin:0;
  }
  .signal-detail{
    margin:0;
    color:var(--muted);
    font-size:14px;
  }
  .badge{
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.08em;
    border-radius:999px;
    padding:6px 9px;
    white-space:nowrap;
    border:1px solid transparent;
  }
  .badge-warning{background:var(--warn-soft); color:var(--warn); border-color:#f3d6b2}
  .badge-positive{background:var(--good-soft); color:var(--good); border-color:#c8eed5}
  .badge-neutral{background:var(--accent-soft); color:var(--accent); border-color:#d8d4fe}
  .moves{
    margin:10px 0 0;
    padding-left:18px;
    color:var(--muted);
    font-size:14px;
  }
  table{
    width:100%;
    border-collapse:collapse;
    background:#fff;
    border:1px solid var(--border);
    border-radius:16px;
    overflow:hidden;
  }
  th,td{
    padding:12px 14px;
    text-align:left;
    border-bottom:1px solid var(--border);
    font-size:14px;
    vertical-align:top;
  }
  th{
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:.08em;
    color:var(--muted);
    background:#faf7f1;
  }
  tr:last-child td{border-bottom:none}
  .secondary-section{
    margin-top:22px;
    padding:16px 18px;
    border:1px solid var(--border);
    border-radius:16px;
    background:#fbf8f2;
  }
  .secondary-section h2{
    margin:0 0 6px;
    font-size:15px;
  }
  .secondary-section p{
    margin:0 0 12px;
    font-size:13px;
    color:var(--muted);
  }
  .secondary-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:10px;
  }
  .secondary-chip{
    background:#fff;
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px 12px;
  }
  .secondary-label{
    display:block;
    font-size:11px;
    text-transform:uppercase;
    letter-spacing:.08em;
    color:var(--muted);
    margin-bottom:4px;
  }
  .secondary-value{
    display:block;
    font-size:14px;
    font-weight:600;
  }
  .footer-note{
    margin-top:24px;
    padding-top:16px;
    border-top:1px solid var(--border);
    color:var(--muted);
    font-size:12px;
  }
  @media (max-width:800px){
    body{padding:16px}
    .page{padding:22px;border-radius:18px}
    .hero,.focus-grid{grid-template-columns:1fr}
    h1{font-size:28px}
    table,thead,tbody,th,td,tr{display:block}
    thead{display:none}
    tr{border-bottom:1px solid var(--border)}
    td{padding:8px 14px}
    td::before{
      content:attr(data-label);
      display:block;
      font-size:11px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.08em;
      margin-bottom:2px;
    }
  }
  @media print{
    body{padding:0;background:#fff}
    .page{box-shadow:none;border:none;max-width:none;border-radius:0;padding:18px}
  }
</style>
</head>
<body>
  <div class="page">
    <div class="eyebrow">Aveil sleep & recovery consult brief</div>

    <div class="hero">
      <div>
        <h1>${escapeHtml(focus.headline)}</h1>
        <p>${escapeHtml(focus.subheadline)}</p>
        <div class="meta-row">
          <span class="chip"><strong>Window</strong> last ${days} days</span>
          <span class="chip"><strong>Generated</strong> ${escapeHtml(dateLabel)}</span>
          <span class="chip"><strong>Focus</strong> ${escapeHtml(focus.focusLabel)}</span>
        </div>
      </div>
      <div class="hero-card">
        <h2>Use this brief in a sleep/recovery consult</h2>
        <ul>
          <li>Lead with the anomaly, not the score.</li>
          <li>Use the evidence table to anchor the discussion.</li>
          <li>Leave with one question and one testable next step.</li>
        </ul>
      </div>
    </div>

    <div class="focus-grid">
      ${renderFocusCard("What changed", focus.whatChanged)}
      ${renderFocusCard("Why it matters", focus.whyItMatters)}
      ${renderFocusCard("What to ask", focus.whatToAsk)}
      ${renderFocusCard("What to test next", focus.whatToTestNext)}
    </div>

    <div class="section">
      <h2 class="section-title">Signals to bring into the consult</h2>
      <p class="section-subtitle">These are the strongest sleep/recovery leads from the recent Apple Health window.</p>
      <div class="signal-list">
        ${signals.map(renderSignalCard).join("\n")}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Sleep and recovery evidence</h2>
      <p class="section-subtitle">Use this table to ground the conversation in concrete recent data instead of a generic wellness score.</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Latest</th>
            <th>Baseline</th>
            <th>Context</th>
          </tr>
        </thead>
        <tbody>
          ${metrics.map(renderMetricRow).join("\n")}
        </tbody>
      </table>
    </div>

    ${renderStableBackgroundSection(buildStableBackgroundMetrics(report))}

    <div class="footer-note">
      Generated from Apple Health data via Aveil. This brief is a structured handoff for a sleep/recovery consult and is not a medical diagnosis.
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    filename: `aveil-sleep-recovery-brief-${formatFileDate(generatedAt)}.html`,
  };
}

function renderFocusCard(title, body) {
  return `<div class="focus-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>`;
}

function renderSignalCard(signal) {
  const badgeClass = signal.level === "warning"
    ? "badge-warning"
    : signal.level === "positive"
      ? "badge-positive"
      : "badge-neutral";

  return `<div class="signal-card">
    <div class="signal-top">
      <p class="signal-title">${escapeHtml(signal.title)}</p>
      <span class="badge ${badgeClass}">${escapeHtml(signal.levelLabel)}</span>
    </div>
    <p class="signal-detail">${escapeHtml(signal.detail)}</p>
    ${signal.move ? `<ul class="moves"><li>${escapeHtml(signal.move)}</li></ul>` : ""}
  </div>`;
}

function renderMetricRow(row) {
  return `<tr>
    <td data-label="Metric">${escapeHtml(row.metric)}</td>
    <td data-label="Latest">${escapeHtml(row.latest)}</td>
    <td data-label="Baseline">${escapeHtml(row.baseline)}</td>
    <td data-label="Context">${escapeHtml(row.context)}</td>
  </tr>`;
}

function renderStableBackgroundSection(items) {
  if (!items.length) return "";

  return `<div class="secondary-section">
    <h2>Other signals look stable</h2>
    <p>This stays secondary on purpose. These background metrics help show the rest of the picture looks fine, so the consult can stay focused on the main sleep/recovery story.</p>
    <div class="secondary-grid">
      ${items.map((item) => `<div class="secondary-chip"><span class="secondary-label">${escapeHtml(item.label)}</span><span class="secondary-value">${escapeHtml(item.value)}</span></div>`).join("")}
    </div>
  </div>`;
}

function buildConsultFocus(report, days) {
  const relevantSignals = buildRelevantSignals(report);
  const primary = relevantSignals[0];
  const normalizedType = normalizeSignalType(primary?.type);
  const isPositive = primary?.level === "positive";
  const isWarning = primary?.level === "warning";
  const signalTitle = primary?.title || "No acute sleep/recovery anomaly was flagged";
  const signalDetail = primary?.detail || "The current strongest pattern is worth validating against symptoms and routine.";
  const signalMove = primary?.move || "Repeat the brief after one week to confirm whether the pattern holds.";

  if (!primary || normalizedType === "all_clear") {
    return {
      focusLabel: "baseline review",
      headline: "No acute anomaly, so use the consult to validate the strongest current pattern",
      subheadline: `This brief narrows the conversation to sleep and recovery over the last ${days} days instead of forcing a generic wellness narrative.`,
      whatChanged: `Strongest pattern: ${signalTitle}. ${signalDetail}`,
      whyItMatters: "Trust drops when the narrative invents a problem that the data does not show. This framing stays anchored to what the report actually flagged.",
      whatToAsk: "Ask whether the strongest current pattern matches real symptoms, recovery, and day-to-day functioning, or whether something important is still missing from the data.",
      whatToTestNext: signalMove,
    };
  }

  if (isPositive) {
    return {
      focusLabel: focusLabelForType(normalizedType, true),
      headline: `No acute anomaly. The strongest current pattern is ${signalTitle.toLowerCase()}`,
      subheadline: `The goal of this consult is to explain what appears to be working and pressure-test whether that baseline is real.`,
      whatChanged: `Top signal: ${signalTitle}. ${signalDetail}`,
      whyItMatters: whyItMattersForSignal(normalizedType, true),
      whatToAsk: askForSignal(normalizedType, true),
      whatToTestNext: signalMove,
    };
  }

  if (isWarning) {
    return {
      focusLabel: focusLabelForType(normalizedType, false),
      headline: `The clearest sleep/recovery anomaly right now is ${signalTitle.toLowerCase()}`,
      subheadline: `This brief leads the consult with the strongest flagged issue from the recent data instead of a generic score summary.`,
      whatChanged: `Top signal: ${signalTitle}. ${signalDetail}`,
      whyItMatters: whyItMattersForSignal(normalizedType, false),
      whatToAsk: askForSignal(normalizedType, false),
      whatToTestNext: signalMove,
    };
  }

  return {
    focusLabel: focusLabelForType(normalizedType, false),
    headline: `The strongest current pattern is ${signalTitle.toLowerCase()}`,
    subheadline: `This consult brief stays tied to the top signal from the actual report instead of trying to force a stronger claim than the data supports.`,
    whatChanged: `Top signal: ${signalTitle}. ${signalDetail}`,
    whyItMatters: whyItMattersForSignal(normalizedType, false),
    whatToAsk: askForSignal(normalizedType, false),
    whatToTestNext: signalMove,
  };
}

function buildRelevantSignals(report) {
  const signals = Array.isArray(report.signals) ? report.signals : [];
  const preferred = signals
    .filter((signal) => isSleepRecoverySignal(signal?.type))
    .map(toDisplaySignal);

  if (preferred.length) return preferred;

  if (signals.length) {
    return signals.slice(0, 3).map(toDisplaySignal);
  }

  return [
    {
      title: "No explicit sleep/recovery signal was generated",
      detail: "Use the evidence table below to lead the consult with the most relevant metric change instead of a generic score.",
      move: "Pick one sleep or recovery metric to follow for the next seven days.",
      level: "neutral",
      levelLabel: "baseline",
      type: "all_clear",
    },
  ];
}

function toDisplaySignal(signal) {
  return {
    title: signal?.title || "Untitled signal",
    detail: signal?.detail || "No detail provided.",
    move: signal?.moves?.[0] || "",
    level: signal?.level || "neutral",
    levelLabel: humanizeLevel(signal?.level || "neutral"),
    type: signal?.type || "",
  };
}

function buildMetricRows(report) {
  const rows = [];
  const sleep = report.sleep || {};
  const recovery = report.recovery || {};
  const lastNight = sleep.lastNight || {};
  const averages = sleep.averages || {};

  if (sleep.available) {
    rows.push({
      metric: "Sleep duration",
      latest: lastNight.totalMinutes != null ? formatDuration(lastNight.totalMinutes) : "—",
      baseline: averages.durationMinutes != null ? formatDuration(averages.durationMinutes) : "—",
      context: withTrend("Sleep trend", sleep.trend),
    });

    rows.push({
      metric: "Deep sleep",
      latest: lastNight.deepMinutes != null ? formatDuration(lastNight.deepMinutes) : "—",
      baseline: averages.deepMinutes != null ? formatDuration(averages.deepMinutes) : "—",
      context: "Lower deep sleep can weaken recovery even when total sleep looks acceptable.",
    });

    rows.push({
      metric: "REM sleep",
      latest: lastNight.remMinutes != null ? formatDuration(lastNight.remMinutes) : "—",
      baseline: averages.remMinutes != null ? formatDuration(averages.remMinutes) : "—",
      context: "REM gives context on sleep quality and continuity, not just time in bed.",
    });

    rows.push({
      metric: "Sleep start",
      latest: lastNight.sleepStart ? formatClock(lastNight.sleepStart) : "—",
      baseline: averages.bedtimeHour != null ? formatHour(averages.bedtimeHour) : "—",
      context: averages.bedtimeVariability != null
        ? `Recent variability is about ±${averages.bedtimeVariability.toFixed(1)} hours.`
        : "Bedtime consistency is a key lever for this consult.",
    });
  }

  if (recovery.available) {
    rows.push({
      metric: "HRV",
      latest: recovery.latestHRV != null ? `${Math.round(recovery.latestHRV)} ms` : "—",
      baseline: recovery.averageHRV != null ? `${Math.round(recovery.averageHRV)} ms avg` : "—",
      context: withTrend("Recovery trend", recovery.trend),
    });

    rows.push({
      metric: "Resting HR",
      latest: "—",
      baseline: recovery.averageRHR != null ? `${Math.round(recovery.averageRHR)} bpm avg` : "—",
      context: "Use alongside HRV and sleep duration, not in isolation.",
    });

    rows.push({
      metric: "Recovery score",
      latest: recovery.recoveryScore != null ? `${Math.round(recovery.recoveryScore)}/100` : "—",
      baseline: report.overall?.components?.find((part) => part.name === "recovery")?.score != null
        ? `${Math.round(report.overall.components.find((part) => part.name === "recovery").score)}/100 component`
        : "—",
      context: "Useful as a summary only after you inspect the sleep and HRV drivers above.",
    });
  }

  return rows;
}

function buildStableBackgroundMetrics(report) {
  const items = [];
  const activity = report.activity || {};
  const nutrition = report.nutrition || {};
  const warningTypes = new Set(
    (Array.isArray(report.signals) ? report.signals : [])
      .filter((signal) => signal?.level === 'warning')
      .map((signal) => signal?.type)
  );

  if (activity.available && !warningTypes.has('activity_low')) {
    const steps = activity.averages?.stepsPerDay;
    const energy = activity.averages?.activeEnergyPerDay;
    const workouts = Array.isArray(activity.recentWorkouts) ? activity.recentWorkouts : [];

    if (Number.isFinite(steps) && steps >= 6000) {
      items.push({ label: 'daily steps', value: `${Math.round(steps).toLocaleString()}/day` });
    }
    if (Number.isFinite(energy) && energy >= 300) {
      items.push({ label: 'active energy', value: `${Math.round(energy)} kcal/day` });
    }
    if (workouts.length >= 3) {
      items.push({ label: 'exercise', value: `${workouts.length} recent workouts logged` });
    }
  }

  if (nutrition.available && !warningTypes.has('protein_low') && !warningTypes.has('calorie_low')) {
    const calories = nutrition.averages?.caloriesPerDay;
    const protein = nutrition.averages?.proteinPerDay;

    if (Number.isFinite(calories) && calories >= 1400) {
      items.push({ label: 'calories', value: `${Math.round(calories).toLocaleString()} kcal/day` });
    }
    if (Number.isFinite(protein) && protein >= 90) {
      items.push({ label: 'protein', value: `${Math.round(protein)} g/day` });
    }
  }

  return items.slice(0, 5);
}

function normalizeSignalType(type) {
  switch (type) {
    case "sleep_consistency":
      return "sleep_consistency";
    case "recovery_low":
    case "recovery_readiness":
      return "recovery_low";
    case "sleep_quality":
      return "sleep_quality";
    case "all_clear":
      return "all_clear";
    case "deep_sleep_deficit":
    case "sleep_debt":
    default:
      return "sleep_debt";
  }
}

function isSleepRecoverySignal(type) {
  return [
    "sleep_debt",
    "sleep_consistency",
    "recovery_low",
    "deep_sleep_deficit",
    "sleep_quality",
    "recovery_readiness",
    "all_clear",
  ].includes(type);
}

function withTrend(label, trend) {
  const pretty = describeTrend(trend);
  return pretty ? `${label}: ${pretty}.` : `${label}: not enough history yet.`;
}

function describeTrend(trend) {
  switch (trend) {
    case "improving":
      return "improving";
    case "declining":
      return "declining";
    case "stable":
      return "stable";
    default:
      return "";
  }
}

function humanizeLevel(level) {
  switch (level) {
    case "warning":
      return "needs attention";
    case "positive":
      return "supportive";
    default:
      return "context";
  }
}

function focusLabelForType(type, positive) {
  switch (type) {
    case "sleep_consistency":
      return positive ? "stable schedule" : "bedtime drift";
    case "recovery_low":
      return positive ? "recovery support" : "recovery dip";
    case "sleep_quality":
      return positive ? "strong sleep quality" : "sleep quality drop";
    case "all_clear":
      return "baseline review";
    case "sleep_debt":
    default:
      return positive ? "sleep baseline" : "sleep debt";
  }
}

function whyItMattersForSignal(type, positive) {
  switch (type) {
    case "sleep_consistency":
      return positive
        ? "Stable sleep timing is often the hidden input holding recovery together, so it is worth identifying what is preserving it."
        : "Sleep timing drift can make total sleep and recovery noisy even when a few nights still look decent on paper.";
    case "recovery_low":
      return positive
        ? "Supportive recovery means the current sleep/recovery setup may actually be working, which is useful to preserve before changing variables."
        : "Soft recovery can reduce training tolerance and make symptoms feel worse even before average sleep duration collapses.";
    case "sleep_quality":
      return positive
        ? "Good sleep quality with solid stage balance is a real asset, but only if it matches symptoms and daytime functioning."
        : "Poor sleep quality can hide inside acceptable total sleep numbers and still drag recovery down.";
    case "all_clear":
      return "The absence of a sharp anomaly is still informative, but only if the brief stays honest about that instead of manufacturing urgency.";
    case "sleep_debt":
    default:
      return positive
        ? "A stable sleep baseline matters because it gives you something concrete to preserve and compare against if symptoms change later."
        : "Short sleep is the most likely driver to test first when energy, recovery, or wake-up quality feels off.";
  }
}

function askForSignal(type, positive) {
  switch (type) {
    case "sleep_consistency":
      return positive
        ? "Ask which part of the routine is most responsible for the stable schedule, and what would be the earliest sign that it is slipping."
        : "Ask whether the main issue is circadian drift, inconsistent time in bed, or fragmentation after sleep onset.";
    case "recovery_low":
      return positive
        ? "Ask whether the recovery strength matches how training and mornings actually feel, or if the data is missing a meaningful stressor."
        : "Ask whether the recovery dip looks more like under-recovery, illness/stress load, or sleep quality deterioration.";
    case "sleep_quality":
      return positive
        ? "Ask which variable is most worth preserving because it seems to support the strong sleep pattern, rather than changing several things at once."
        : "Ask whether the quality problem is more about awakenings, breathing, bedtime timing, or sleep opportunity.";
    case "all_clear":
      return "Ask which single metric would be most useful to monitor next so the next brief can detect change earlier.";
    case "sleep_debt":
    default:
      return positive
        ? "Ask whether the stable baseline is enough for current goals, or whether symptoms suggest a hidden problem despite acceptable averages."
        : "Ask whether the short-sleep pattern comes from insufficient time in bed, fragmented sleep, or a downstream issue suppressing quality.";
  }
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "—";
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatClock(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHour(decimalHour) {
  if (!Number.isFinite(decimalHour)) return "—";
  const hour = Math.floor(decimalHour);
  const minute = Math.round((decimalHour - hour) * 60);
  const date = new Date(Date.UTC(2000, 0, 1, hour % 24, minute));
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function formatFileDate(date) {
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
