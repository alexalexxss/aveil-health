/**
 * Shared consult brief renderer for generic and sleep-focused modes.
 */

export function generateHealthConsultBriefHTML(report, options = {}) {
  const days = Number.isFinite(options.days) ? options.days : 30;
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const primarySignal = pickPrimarySignal(report?.signals, { scope: "generic" });
  const displaySignals = buildDisplaySignals(report, { scope: "generic" });

  return renderConsultBrief({
    mode: "generic",
    title: "Aveil health consult brief",
    eyebrow: "Aveil health consult brief",
    filenamePrefix: "aveil-health-consult-brief",
    generatedAt,
    days,
    focus: buildGenericFocus(primarySignal, days),
    signals: displaySignals,
    metrics: buildMetricRows(report, primarySignal, { scope: "generic" }),
    stableItems: buildStableBackgroundMetrics(report, { primarySignal }),
  });
}

export function generateSleepConsultBriefHTML(report, options = {}) {
  const days = Number.isFinite(options.days) ? options.days : 30;
  const generatedAt = options.generatedAt ? new Date(options.generatedAt) : new Date();
  const primarySignal = pickPrimarySignal(report?.signals, { scope: "sleep" });
  const displaySignals = buildDisplaySignals(report, { scope: "sleep" });

  return renderConsultBrief({
    mode: "sleep",
    title: "Aveil sleep & recovery consult brief",
    eyebrow: "Aveil sleep & recovery consult brief",
    filenamePrefix: "aveil-sleep-recovery-brief",
    generatedAt,
    days,
    focus: buildSleepFocus(primarySignal, days),
    signals: displaySignals,
    metrics: buildMetricRows(report, primarySignal, { scope: "sleep" }),
    stableItems: buildStableBackgroundMetrics(report, { primarySignal }),
  });
}

// Back-compat alias for the default brief generator.
export const generateAppointmentBriefHTML = generateHealthConsultBriefHTML;

function renderConsultBrief({
  mode,
  title,
  eyebrow,
  filenamePrefix,
  generatedAt,
  days,
  focus,
  signals,
  metrics,
  stableItems,
}) {
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
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=switzer@300,400,500&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,300;0,400;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#F7F3EB;
    --paper:#F7F3EB;
    --ink:#0C0907;
    --muted:#3D342A;
    --rule:rgba(12,9,7,0.12);
    --rule-soft:rgba(12,9,7,0.08);
    --accent:#D97A2B;
    --serif:"Newsreader",Georgia,serif;
    --sans:"Switzer",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,monospace;
  }
  *{box-sizing:border-box}
  body{
    margin:0;
    padding:32px;
    background:var(--bg);
    color:var(--ink);
    font-family:var(--sans);
    line-height:1.45;
    font-feature-settings:"tnum" 1;
  }
  .page{
    max-width:980px;
    margin:0 auto;
    background:var(--paper);
    border:1px solid var(--rule);
    border-radius:6px;
    padding:36px;
  }
  .eyebrow{
    font-family:var(--mono);
    font-size:10px;
    font-weight:400;
    letter-spacing:.20em;
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
    margin:0 0 12px;
    font-family:var(--sans);
    font-weight:500;
    font-size:28px;
    line-height:1.05;
    letter-spacing:-.015em;
    color:var(--ink);
  }
  .hero p{
    margin:0;
    color:var(--muted);
    font-family:var(--serif);
    font-size:15px;
    line-height:1.5;
  }
  .hero-card{
    border:1px solid var(--rule);
    border-radius:6px;
    padding:18px;
    background:transparent;
  }
  .hero-card h2{
    margin:0 0 10px;
    font-family:var(--sans);
    font-weight:500;
    font-size:14px;
    letter-spacing:-.01em;
    color:var(--ink);
  }
  .hero-card ul{
    list-style:none;
    margin:0;
    padding:0;
    color:var(--muted);
    display:grid;
    gap:10px;
    font-family:var(--serif);
    font-size:13px;
    line-height:1.45;
  }
  .hero-card li{
    display:grid;
    grid-template-columns:10px minmax(0,1fr);
    column-gap:8px;
    align-items:start;
  }
  .hero-card li::before{
    content:"\\2022";
    color:var(--accent);
    font-weight:500;
    line-height:1.4;
  }
  .meta-row{
    display:flex;
    flex-wrap:wrap;
    gap:10px;
    margin:14px 0 0;
    font-family:var(--mono);
    font-size:10px;
    letter-spacing:.08em;
    text-transform:uppercase;
    color:var(--muted);
  }
  .chip{
    display:inline-flex;
    align-items:center;
    gap:6px;
    padding:0;
    border-radius:0;
    background:transparent;
    border:none;
    font-size:10px;
    color:var(--muted);
    font-family:var(--mono);
  }
  .chip strong{color:var(--ink);font-weight:500;margin-right:4px}
  .focus-grid{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:14px;
    margin:18px 0 26px;
  }
  .focus-card{
    border:1px solid var(--rule);
    border-radius:6px;
    padding:18px;
    background:transparent;
  }
  .focus-card h3{
    margin:0 0 8px;
    font-family:var(--mono);
    font-size:10px;
    font-weight:400;
    letter-spacing:.20em;
    text-transform:uppercase;
    color:var(--accent);
  }
  .focus-card p{
    margin:0;
    font-family:var(--serif);
    font-size:14px;
    line-height:1.55;
    color:var(--ink);
  }
  .section{
    margin-top:24px;
  }
  .section-title{
    margin:0 0 12px;
    font-family:var(--sans);
    font-size:16px;
    font-weight:500;
    letter-spacing:-.015em;
    color:var(--ink);
  }
  .section-subtitle{
    margin:-2px 0 14px;
    color:var(--muted);
    font-family:var(--serif);
    font-size:13px;
    line-height:1.45;
  }
  .signal-list{
    display:grid;
    gap:12px;
  }
  .signal-card{
    border:1px solid var(--rule);
    border-radius:6px;
    padding:16px;
    background:transparent;
  }
  .signal-top{
    display:flex;
    justify-content:space-between;
    gap:12px;
    align-items:flex-start;
    margin-bottom:6px;
  }
  .signal-title{
    font-family:var(--sans);
    font-size:14px;
    font-weight:500;
    letter-spacing:-.01em;
    margin:0;
    color:var(--ink);
  }
  .signal-detail{
    margin:0;
    color:var(--muted);
    font-family:var(--serif);
    font-size:13px;
    line-height:1.55;
  }
  .badge{
    font-family:var(--mono);
    font-size:10px;
    font-weight:400;
    text-transform:uppercase;
    letter-spacing:.20em;
    border-radius:0;
    padding:0;
    white-space:nowrap;
    border:none;
    background:transparent;
  }
  .badge-warning{color:var(--accent)}
  .badge-positive{color:var(--muted)}
  .badge-neutral{color:var(--muted)}
  .moves{
    list-style:none;
    margin:10px 0 0;
    padding:0;
    color:var(--muted);
    font-family:var(--serif);
    font-size:13px;
    line-height:1.45;
  }
  .moves li{
    display:grid;
    grid-template-columns:10px minmax(0,1fr);
    column-gap:8px;
    align-items:baseline;
  }
  .moves li::before{
    content:"\\2022";
    color:var(--accent);
  }
  table{
    width:100%;
    border-collapse:collapse;
    background:transparent;
    border:none;
    border-radius:0;
    overflow:visible;
    box-shadow:none;
    font-variant-numeric:tabular-nums;
  }
  th,td{
    padding:10px 12px;
    text-align:left;
    border-bottom:1px solid var(--rule-soft);
    font-size:13px;
    vertical-align:top;
    font-family:var(--mono);
    color:var(--ink);
  }
  th{
    font-family:var(--mono);
    font-size:10px;
    font-weight:400;
    text-transform:uppercase;
    letter-spacing:.20em;
    color:var(--muted);
    background:transparent;
    border-bottom:1px solid var(--rule);
    padding-bottom:8px;
  }
  td[data-label="Context"]{
    font-family:var(--serif);
    color:var(--muted);
    font-size:13px;
  }
  tr:last-child td{border-bottom:none}
  .secondary-section{
    margin-top:22px;
    padding:16px 18px;
    border:1px solid var(--rule);
    border-radius:6px;
    background:transparent;
  }
  .secondary-section h2{
    margin:0 0 6px;
    font-family:var(--sans);
    font-size:14px;
    font-weight:500;
    letter-spacing:-.01em;
    color:var(--ink);
  }
  .secondary-section p{
    margin:0 0 12px;
    font-family:var(--serif);
    font-size:13px;
    color:var(--muted);
    line-height:1.5;
  }
  .secondary-grid{
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
    gap:10px;
  }
  .secondary-chip{
    background:transparent;
    border:1px solid var(--rule);
    border-radius:6px;
    padding:10px 12px;
  }
  .secondary-label{
    display:block;
    font-family:var(--mono);
    font-size:10px;
    font-weight:400;
    text-transform:uppercase;
    letter-spacing:.20em;
    color:var(--muted);
    margin-bottom:6px;
  }
  .secondary-value{
    display:block;
    font-family:var(--serif);
    font-size:14px;
    font-weight:400;
    line-height:1.45;
    color:var(--ink);
  }
  .footer-note{
    margin-top:24px;
    padding-top:16px;
    border-top:1px solid var(--rule);
    color:var(--muted);
    font-family:var(--serif);
    font-size:12px;
    line-height:1.5;
  }
  @media (max-width:800px){
    body{padding:16px}
    .page{padding:22px;border-radius:6px}
    .hero,.focus-grid{grid-template-columns:1fr}
    .hero h1{font-size:24px}
    table,thead,tbody,th,td,tr{display:block}
    thead{display:none}
    tr{border-bottom:1px solid var(--rule)}
    td{padding:8px 14px;font-family:var(--mono)}
    td[data-label="Context"]{font-family:var(--serif)}
    td::before{
      content:attr(data-label);
      display:block;
      font-family:var(--mono);
      font-size:10px;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.20em;
      margin-bottom:2px;
    }
  }
  @media print{
    body{padding:0;background:#fff}
    .page{box-shadow:none;max-width:none;border-radius:0;padding:18px}
  }
</style>
</head>
<body>
  <div class="page">
    <div class="eyebrow">${escapeHtml(eyebrow)}</div>

    <div class="hero">
      <div>
        <h1>${escapeHtml(focus.headline)}</h1>
        <p>${escapeHtml(focus.subheadline)}</p>
        <div class="meta-row">
          <span class="chip"><strong>Window:</strong> last ${days} days</span>
          <span class="chip"><strong>Generated:</strong> ${escapeHtml(dateLabel)}</span>
          <span class="chip"><strong>Focus:</strong> ${escapeHtml(focus.focusLabel)}</span>
        </div>
      </div>
      <div class="hero-card">
        <h2>${mode === "sleep" ? "Use this in a sleep/recovery consult" : "Use this in a health consult"}</h2>
        <ul>
          <li>Lead with the strongest signal, not a summary number.</li>
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
      <h2 class="section-title">${mode === "sleep" ? "Signals to bring into the sleep/recovery consult" : "Signals to bring into the consult"}</h2>
      <p class="section-subtitle">${mode === "sleep" ? "These are the strongest sleep/recovery leads in the recent Apple Health window." : "These are the strongest cross-domain leads in the recent Apple Health window."}</p>
      <div class="signal-list">
        ${signals.map(renderSignalCard).join("\n")}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">${mode === "sleep" ? "Sleep and recovery evidence" : "Evidence table"}</h2>
      <p class="section-subtitle">Ground the conversation in concrete recent data.</p>
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

    ${renderStableBackgroundSection(stableItems)}

    <div class="footer-note">
      Generated from Apple Health data via Aveil. This brief is a structured handoff for a ${mode === "sleep" ? "sleep/recovery" : "health"} consult and is not a medical diagnosis.
    </div>
  </div>
</body>
</html>`;

  return {
    html,
    filename: `${filenamePrefix}-${formatFileDate(generatedAt)}.html`,
  };
}

function buildGenericFocus(primarySignal, days) {
  const primary = primarySignal || synthesizeFallbackSignal("generic");
  const kind = normalizeSignalType(primary.type);
  const positive = primary.level === "positive";
  const acute = primary.level === "warning" || primary.level === "neutral";
  const title = primary.title || "No acute anomaly was flagged";
  const detail = primary.detail || "The current strongest pattern is worth validating against symptoms and routine.";
  const move = primary.move || "Generate a new brief after one week to see whether the pattern holds.";

  if (kind === "all_clear" || positive) {
    return {
      focusLabel: focusLabelForType(kind, { positive, scope: "generic" }),
      headline: `No acute anomaly. The strongest current pattern is ${title.toLowerCase()}`,
      subheadline: `This brief uses the strongest cross-domain signal across sleep, recovery, activity, and nutrition over the last ${days} days.`,
      whatChanged: `Top signal: ${title}. ${detail}`, 
      whyItMatters: whyItMattersForType(kind, { positive, scope: "generic" }),
      whatToAsk: askForType(kind, { positive, scope: "generic" }),
      whatToTestNext: move,
    };
  }

  return {
    focusLabel: focusLabelForType(kind, { positive: false, scope: "generic" }),
    headline: `The clearest current health consult issue is ${title.toLowerCase()}`,
    subheadline: `This brief uses the strongest cross-domain signal across sleep, recovery, activity, and nutrition over the last ${days} days.`,  
    whatChanged: `Top signal: ${title}. ${detail}`,
    whyItMatters: whyItMattersForType(kind, { positive: false, scope: "generic" }),
    whatToAsk: askForType(kind, { positive: false, scope: "generic" }),
    whatToTestNext: move,
  };
}

function buildSleepFocus(primarySignal, days) {
  const primary = primarySignal || synthesizeFallbackSignal("sleep");
  const kind = normalizeSignalType(primary.type);
  const positive = primary.level === "positive";
  const title = primary.title || "No acute sleep/recovery anomaly was flagged";
  const detail = primary.detail || "The current strongest sleep/recovery pattern is worth validating against symptoms and routine.";
  const move = primary.move || "Generate a new sleep brief after one week to compare against the current baseline.";

  if (kind === "all_clear" || positive) {
    return {
      focusLabel: focusLabelForType(kind, { positive, scope: "sleep" }),
      headline: `No acute anomaly. The strongest current sleep/recovery pattern is ${title.toLowerCase()}`,
      subheadline: `This narrower brief stays focused on sleep and recovery over the last ${days} days instead of broadening into a full lifestyle review.`,
      whatChanged: `Top signal: ${title}. ${detail}`,
      whyItMatters: whyItMattersForType(kind, { positive, scope: "sleep" }),
      whatToAsk: askForType(kind, { positive, scope: "sleep" }),
      whatToTestNext: move,
    };
  }

  return {
    focusLabel: focusLabelForType(kind, { positive: false, scope: "sleep" }),
    headline: `The clearest sleep/recovery anomaly right now is ${title.toLowerCase()}`,
    subheadline: `This sleep-specific brief intentionally ignores non-sleep domains so the consult can stay on the main wedge.`,
    whatChanged: `Top signal: ${title}. ${detail}`,
    whyItMatters: whyItMattersForType(kind, { positive: false, scope: "sleep" }),
    whatToAsk: askForType(kind, { positive: false, scope: "sleep" }),
    whatToTestNext: move,
  };
}

function buildDisplaySignals(report, { scope }) {
  const candidates = sortSignals(selectSignals(report?.signals, { scope }));
  if (!candidates.length) {
    return [toDisplaySignal(synthesizeFallbackSignal(scope))];
  }
  return candidates.slice(0, 3).map(toDisplaySignal);
}

function pickPrimarySignal(signals, { scope }) {
  const candidates = sortSignals(selectSignals(signals, { scope }));
  return candidates[0] || null;
}

function selectSignals(signals, { scope }) {
  const items = Array.isArray(signals) ? signals.filter(Boolean) : [];
  if (scope === "sleep") {
    return items.filter((signal) => isSleepRecoveryDomain(signalDomain(signal.type)) || signalDomain(signal.type) === "all_clear");
  }
  return items;
}

function sortSignals(signals) {
  const rank = { warning: 3, neutral: 2, positive: 1 };
  return [...signals].sort((a, b) => {
    const levelDelta = (rank[b.level] || 0) - (rank[a.level] || 0);
    if (levelDelta !== 0) return levelDelta;
    if (signalDomain(a.type) === "all_clear" && signalDomain(b.type) !== "all_clear") return 1;
    if (signalDomain(b.type) === "all_clear" && signalDomain(a.type) !== "all_clear") return -1;
    return 0;
  });
}

function buildMetricRows(report, primarySignal, { scope }) {
  const domain = scope === "sleep"
    ? "sleep"
    : signalDomain(primarySignal?.type);

  switch (domain) {
    case "recovery":
      return buildRecoveryMetricRows(report);
    case "activity":
      return buildActivityMetricRows(report);
    case "nutrition":
      return buildNutritionMetricRows(report);
    case "sleep":
    case "all_clear":
    default:
      return buildSleepMetricRows(report);
  }
}

function buildSleepMetricRows(report) {
  const rows = [];
  const sleep = report?.sleep || {};
  const recovery = report?.recovery || {};
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
      context: "Use this to see whether sleep quality is matching total time in bed.",
    });
    rows.push({
      metric: "REM sleep",
      latest: lastNight.remMinutes != null ? formatDuration(lastNight.remMinutes) : "—",
      baseline: averages.remMinutes != null ? formatDuration(averages.remMinutes) : "—",
      context: "Helpful context when recovery feels off despite decent duration.",
    });
    rows.push({
      metric: "Sleep start",
      latest: lastNight.sleepStart ? formatClock(lastNight.sleepStart) : "—",
      baseline: averages.bedtimeHour != null ? formatHour(averages.bedtimeHour) : "—",
      context: averages.bedtimeVariability != null
        ? `Recent variability is about ±${averages.bedtimeVariability.toFixed(1)} hours.`
        : "Bedtime consistency is a major sleep/recovery lever.",
    });
  }

  if (recovery.available) {
    rows.push({
      metric: "HRV",
      latest: recovery.latestHRV != null ? `${Math.round(recovery.latestHRV)} ms` : "—",
      baseline: recovery.averageHRV != null ? `${Math.round(recovery.averageHRV)} ms avg` : "—",
      context: withTrend("Recovery trend", recovery.trend),
    });
  }

  return rows;
}

function buildRecoveryMetricRows(report) {
  const rows = [];
  const recovery = report?.recovery || {};
  const sleep = report?.sleep || {};
  const lastNight = sleep.lastNight || {};
  const averages = sleep.averages || {};

  if (recovery.available) {
    rows.push({
      metric: "HRV",
      latest: recovery.latestHRV != null ? `${Math.round(recovery.latestHRV)} ms` : "—",
      baseline: recovery.averageHRV != null ? `${Math.round(recovery.averageHRV)} ms avg` : "—",
      context: withTrend("Recovery trend", recovery.trend),
    });
    rows.push({
      metric: "Recovery score",
      latest: recovery.recoveryScore != null ? `${Math.round(recovery.recoveryScore)}/100` : "—",
      baseline: recovery.readiness ? titleCase(recovery.readiness) : "—",
      context: "Treat this as a summary of the driver metrics, not as the sole conclusion.",
    });
    rows.push({
      metric: "Resting HR",
      latest: "—",
      baseline: recovery.averageRHR != null ? `${Math.round(recovery.averageRHR)} bpm avg` : "—",
      context: "Use alongside HRV and sleep, not in isolation.",
    });
  }

  if (sleep.available) {
    rows.push({
      metric: "Sleep duration",
      latest: lastNight.totalMinutes != null ? formatDuration(lastNight.totalMinutes) : "—",
      baseline: averages.durationMinutes != null ? formatDuration(averages.durationMinutes) : "—",
      context: "Sleep is the first upstream driver to check when recovery looks soft.",
    });
    rows.push({
      metric: "Deep sleep",
      latest: lastNight.deepMinutes != null ? formatDuration(lastNight.deepMinutes) : "—",
      baseline: averages.deepMinutes != null ? formatDuration(averages.deepMinutes) : "—",
      context: "Helps distinguish short sleep from lower-quality sleep.",
    });
  }

  return rows;
}

function buildActivityMetricRows(report) {
  const rows = [];
  const activity = report?.activity || {};
  const sleep = report?.sleep || {};
  const recovery = report?.recovery || {};
  const workouts = Array.isArray(activity.recentWorkouts) ? activity.recentWorkouts : [];

  if (activity.available) {
    rows.push({
      metric: "Daily steps",
      latest: activity.lastDay?.steps != null ? `${Math.round(activity.lastDay.steps).toLocaleString()}` : "—",
      baseline: activity.averages?.stepsPerDay != null ? `${Math.round(activity.averages.stepsPerDay).toLocaleString()}/day` : "—",
      context: "The movement floor matters even when a few workouts are still present.",
    });
    rows.push({
      metric: "Active energy",
      latest: activity.lastDay?.activeEnergy != null ? `${Math.round(activity.lastDay.activeEnergy)} kcal` : "—",
      baseline: activity.averages?.activeEnergyPerDay != null ? `${Math.round(activity.averages.activeEnergyPerDay)} kcal/day` : "—",
      context: "Useful for spotting low-output weeks that structured training alone can hide.",
    });
    rows.push({
      metric: "Exercise",
      latest: workouts.length ? `${workouts[0].type} • ${Math.round(workouts[0].duration)} min` : "—",
      baseline: workouts.length ? `${workouts.length} recent workouts` : "—",
      context: "Recent workouts add context, but the daily movement floor usually explains the signal better.",
    });
  }

  if (sleep.available) {
    rows.push({
      metric: "Sleep duration",
      latest: sleep.lastNight?.totalMinutes != null ? formatDuration(sleep.lastNight.totalMinutes) : "—",
      baseline: sleep.averages?.durationMinutes != null ? formatDuration(sleep.averages.durationMinutes) : "—",
      context: "Sleep gives context on whether low activity is an isolated behavior issue or part of a broader low-energy week.",
    });
  }

  if (recovery.available) {
    rows.push({
      metric: "Recovery score",
      latest: recovery.recoveryScore != null ? `${Math.round(recovery.recoveryScore)}/100` : "—",
      baseline: recovery.readiness ? titleCase(recovery.readiness) : "—",
      context: "Use to judge whether lower activity might be explained by recovery softness or simply a lighter routine.",
    });
  }

  return rows;
}

function buildNutritionMetricRows(report) {
  const rows = [];
  const nutrition = report?.nutrition || {};
  const activity = report?.activity || {};
  const sleep = report?.sleep || {};

  if (nutrition.available) {
    rows.push({
      metric: "Protein",
      latest: nutrition.lastDay?.protein != null ? `${Math.round(nutrition.lastDay.protein)} g` : "—",
      baseline: nutrition.averages?.proteinPerDay != null ? `${Math.round(nutrition.averages.proteinPerDay)} g/day` : "—",
      context: "Protein tends to be the clearest nutrition recovery bottleneck in this brief.",
    });
    rows.push({
      metric: "Calories",
      latest: nutrition.lastDay?.calories != null ? `${Math.round(nutrition.lastDay.calories)} kcal` : "—",
      baseline: nutrition.averages?.caloriesPerDay != null ? `${Math.round(nutrition.averages.caloriesPerDay)} kcal/day` : "—",
      context: "Helpful context so a protein lag is not mistaken for a high-calorie week with poor composition.",
    });
  }

  if (activity.available) {
    rows.push({
      metric: "Daily steps",
      latest: activity.lastDay?.steps != null ? `${Math.round(activity.lastDay.steps).toLocaleString()}` : "—",
      baseline: activity.averages?.stepsPerDay != null ? `${Math.round(activity.averages.stepsPerDay).toLocaleString()}/day` : "—",
      context: "Movement helps explain whether intake is low relative to a heavier or lighter activity base.",
    });
  }

  if (sleep.available) {
    rows.push({
      metric: "Sleep duration",
      latest: sleep.lastNight?.totalMinutes != null ? formatDuration(sleep.lastNight.totalMinutes) : "—",
      baseline: sleep.averages?.durationMinutes != null ? formatDuration(sleep.averages.durationMinutes) : "—",
      context: "Sleep adds recovery context so nutrition changes are not interpreted in isolation.",
    });
  }

  return rows;
}

function buildStableBackgroundMetrics(report, { primarySignal }) {
  const items = [];
  const activity = report?.activity || {};
  const nutrition = report?.nutrition || {};
  const primaryDomain = signalDomain(primarySignal?.type);
  const nonPositiveDomains = new Set(
    (Array.isArray(report?.signals) ? report.signals : [])
      .filter((signal) => signal?.level !== "positive")
      .map((signal) => signalDomain(signal?.type))
  );

  if (primaryDomain !== "activity" && !nonPositiveDomains.has("activity") && activity.available) {
    const steps = activity.averages?.stepsPerDay;
    const energy = activity.averages?.activeEnergyPerDay;
    const workouts = Array.isArray(activity.recentWorkouts) ? activity.recentWorkouts : [];

    if (Number.isFinite(steps) && steps >= 6000) {
      items.push({ label: "daily steps", value: `${Math.round(steps).toLocaleString()}/day` });
    }
    if (Number.isFinite(energy) && energy >= 300) {
      items.push({ label: "active energy", value: `${Math.round(energy)} kcal/day` });
    }
    if (workouts.length >= 3) {
      items.push({ label: "exercise", value: `${workouts.length} recent workouts logged` });
    }
  }

  if (primaryDomain !== "nutrition" && !nonPositiveDomains.has("nutrition") && nutrition.available) {
    const calories = nutrition.averages?.caloriesPerDay;
    const protein = nutrition.averages?.proteinPerDay;

    if (Number.isFinite(calories) && calories >= 1400) {
      items.push({ label: "calories", value: `${Math.round(calories).toLocaleString()} kcal/day` });
    }
    if (Number.isFinite(protein) && protein >= 90) {
      items.push({ label: "protein", value: `${Math.round(protein)} g/day` });
    }
  }

  return items.slice(0, 5);
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
    <p>This stays secondary on purpose. It shows the broader picture is relatively stable so the consult can stay focused on the main issue.</p>
    <div class="secondary-grid">
      ${items.map((item) => `<div class="secondary-chip"><span class="secondary-label">${escapeHtml(item.label)}</span><span class="secondary-value">${escapeHtml(item.value)}</span></div>`).join("")}
    </div>
  </div>`;
}

function toDisplaySignal(signal) {
  return {
    title: signal?.title || "Untitled signal",
    detail: signal?.detail || "No detail provided.",
    move: signal?.moves?.[0] || signal?.move || "",
    level: signal?.level || "neutral",
    levelLabel: humanizeLevel(signal?.level || "neutral"),
    type: signal?.type || "all_clear",
  };
}

function synthesizeFallbackSignal(scope) {
  if (scope === "sleep") {
    return {
      type: "all_clear",
      level: "positive",
      title: "No acute sleep/recovery anomaly was flagged",
      detail: "Use the evidence table to validate the strongest current sleep/recovery pattern rather than forcing a stronger claim than the data supports.",
      moves: ["Pick one sleep or recovery metric to re-check next week."],
    };
  }

  return {
    type: "all_clear",
    level: "positive",
    title: "No acute health anomaly was flagged",
    detail: "Use the strongest current pattern and the evidence table to decide what deserves follow-up.",
    moves: ["Repeat the brief after one week or after a routine change."],
  };
}

function signalDomain(type) {
  switch (type) {
    case "sleep_quality":
    case "deep_sleep_deficit":
    case "sleep_debt":
    case "sleep_consistency":
      return "sleep";
    case "recovery_low":
    case "recovery_readiness":
      return "recovery";
    case "activity_low":
      return "activity";
    case "protein_lag":
      return "nutrition";
    case "all_clear":
      return "all_clear";
    default:
      return "other";
  }
}

function isSleepRecoveryDomain(domain) {
  return domain === "sleep" || domain === "recovery";
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
    case "activity_low":
      return "activity_low";
    case "protein_lag":
      return "protein_lag";
    case "all_clear":
      return "all_clear";
    case "deep_sleep_deficit":
      return "deep_sleep_deficit";
    case "sleep_debt":
    default:
      return "sleep_debt";
  }
}

function focusLabelForType(type, { positive, scope }) {
  switch (type) {
    case "sleep_consistency":
      return positive ? "stable schedule" : "bedtime drift";
    case "recovery_low":
      return positive ? "recovery support" : "recovery dip";
    case "sleep_quality":
      return positive ? "strong sleep quality" : "sleep quality drop";
    case "activity_low":
      return positive ? "stable activity base" : "activity baseline";
    case "protein_lag":
      return positive ? "stable nutrition base" : "protein gap";
    case "deep_sleep_deficit":
      return positive ? "deep sleep support" : "deep sleep deficit";
    case "all_clear":
      return scope === "sleep" ? "sleep baseline" : "baseline review";
    case "sleep_debt":
    default:
      return positive ? "sleep baseline" : "sleep debt";
  }
}

function whyItMattersForType(type, { positive, scope }) {
  switch (type) {
    case "sleep_consistency":
      return positive
        ? "Stable sleep timing is often the hidden input holding recovery together, so it is worth identifying what is preserving it."
        : "Sleep timing drift can make total sleep and recovery noisy even when a few nights still look decent on paper.";
    case "recovery_low":
      return positive
        ? "Supportive recovery suggests the current sleep/recovery setup may actually be working, which is useful to preserve before changing variables."
        : "Soft recovery can reduce training tolerance and make fatigue feel worse even when sleep duration looks acceptable.";
    case "sleep_quality":
      return positive
        ? "Good sleep quality is a real asset, but only if it matches symptoms and daytime functioning."
        : "Sleep quality can degrade before total sleep fully collapses, so it often explains why recovery feels off despite acceptable hours.";
    case "deep_sleep_deficit":
      return positive
        ? "A stable deep-sleep pattern is worth protecting because it often tracks real recovery quality."
        : "Deep sleep deficits can weaken recovery and morning readiness even when total sleep looks fine.";
    case "activity_low":
      return positive
        ? "A stable movement floor keeps the rest of the health picture easier to interpret."
        : "Low activity can drag energy, conditioning, and recovery even when a few workouts still show up in the log.";
    case "protein_lag":
      return positive
        ? "A stable nutrition base makes recovery signals easier to trust."
        : "Protein or calorie gaps can blunt recovery and make otherwise decent training or sleep data less useful.";
    case "all_clear":
      return scope === "sleep"
        ? "The absence of a sharp sleep/recovery anomaly is still informative, but only if the brief stays honest about that instead of manufacturing urgency."
        : "The absence of a sharp anomaly is still informative, but only if the brief stays honest about that instead of manufacturing urgency.";
    case "sleep_debt":
    default:
      return positive
        ? "A stable sleep baseline gives you something concrete to preserve and compare against if symptoms change later."
        : "Short sleep is the most likely driver to test first when energy, recovery, or wake-up quality feels off.";
  }
}

function askForType(type, { positive }) {
  switch (type) {
    case "sleep_consistency":
      return positive
        ? "Ask which recent schedule anchors or habits might best explain the stable timing, so they can be preserved if symptoms return."
        : "Ask whether the main issue is circadian drift, inconsistent time in bed, or fragmentation after sleep onset.";
    case "recovery_low":
      return positive
        ? "Ask whether the recovery strength matches subjective energy and training response, or if the data is missing a meaningful stressor."
        : "Ask whether the recovery dip looks more like under-recovery, illness/stress load, or sleep quality deterioration.";
    case "sleep_quality":
      return positive
        ? "Ask which recent habits, timing changes, or conditions might best explain the stronger sleep quality, so the useful ones can be preserved."
        : "Ask whether the quality problem is more about awakenings, breathing, bedtime timing, or sleep opportunity.";
    case "deep_sleep_deficit":
      return positive
        ? "Ask which recent conditions or habits seem most likely to support deeper sleep, so they can be preserved under stress or travel."
        : "Ask whether the deep-sleep drop is being driven by schedule drift, late meals, alcohol, stress, or sleep fragmentation.";
    case "activity_low":
      return positive
        ? "Ask which recent habits or constraints are most likely keeping movement consistently up."
        : "Ask whether the main issue is total movement floor, structured exercise frequency, or inactivity between workouts.";
    case "protein_lag":
      return positive
        ? "Ask which parts of the current eating pattern are most likely keeping protein intake stable."
        : "Ask whether intake is too low overall, protein timing is off, or the current food pattern is too inconsistent to support recovery.";
    case "all_clear":
      return "Ask which single metric would be most useful to monitor next so the next brief can detect change earlier.";
    case "sleep_debt":
    default:
      return positive
        ? "Ask whether the stable baseline is enough for current goals, or whether symptoms suggest a hidden problem despite acceptable averages."
        : "Ask whether the short-sleep pattern comes from insufficient time in bed, fragmented sleep, or a downstream issue suppressing quality.";
  }
}

function humanizeLevel(level) {
  switch (level) {
    case "warning":
      return "needs attention";
    case "positive":
      return "favorable";
    default:
      return "context";
  }
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

function titleCase(value) {
  return String(value || "")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
